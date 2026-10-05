import React, { useMemo, useState } from 'react';
import { TransactionLog, Drug, LogType } from '@/contexts/BlockchainContextTypes';

interface AnalyticsDashboardProps {
  drugs: Drug[];
  transactionLogs: TransactionLog[];
}

const DAY = 86_400_000;
const LOW_STOCK_UNITS = 100;
const EXPIRY_WINDOW_DAYS = 30;
const RECEIVED: LogType[] = ['ADD_DRUG', 'BATCH_IMPORT'];

const ACTION_LABEL: Record<LogType, string> = {
  ADD_DRUG: 'Received',
  BATCH_IMPORT: 'Received (import)',
  DISPENSE_DRUG: 'Dispensed',
  ADJUST_STOCK: 'Adjusted',
  WRITE_OFF: 'Written off',
  STAFF_GRANTED: 'Staff added',
  STAFF_REVOKED: 'Staff removed',
};

const sumUnits = (logs: TransactionLog[], types: LogType[]) =>
  logs.filter(l => types.includes(l.type)).reduce((s, l) => s + l.quantity, 0);

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function dailyTotals(logs: TransactionLog[], types: LogType[], days = 14) {
  const rows = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * DAY);
    return { key: dayKey(d.getTime()), label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), qty: 0 };
  });
  const byKey = new Map(rows.map(r => [r.key, r]));
  logs.forEach(l => {
    if (types.includes(l.type)) {
      const row = byKey.get(dayKey(l.timestamp));
      if (row) row.qty += l.quantity;
    }
  });
  return rows;
}

function topDispensed(logs: TransactionLog[], n = 6) {
  const totals = new Map<string, number>();
  logs.filter(l => l.type === 'DISPENSE_DRUG').forEach(l => totals.set(l.drugName, (totals.get(l.drugName) ?? 0) + l.quantity));
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a);
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function relativeTime(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.floor(hrs / 24)} d ago`;
}

type Flag = { drug: Drug; status: string; tone: 'bad' | 'warn'; sort: number };

function attentionList(drugs: Drug[]): Flag[] {
  const now = Date.now();
  const flags: Flag[] = [];
  drugs.forEach(d => {
    if (d.quantity === 0) return; // nothing on the shelf, nothing to act on
    if (d.expiryDate < now) {
      flags.push({ drug: d, status: `Expired ${fmtDate(d.expiryDate)}`, tone: 'bad', sort: 0 });
    } else if (d.expiryDate < now + EXPIRY_WINDOW_DAYS * DAY) {
      const days = Math.ceil((d.expiryDate - now) / DAY);
      flags.push({ drug: d, status: `Expires in ${days} day${days === 1 ? '' : 's'}`, tone: 'warn', sort: 1 + days / 100 });
    } else if (d.quantity <= LOW_STOCK_UNITS) {
      flags.push({ drug: d, status: 'Low stock', tone: 'warn', sort: 5 });
    }
  });
  return flags.sort((a, b) => a.sort - b.sort);
}

const Figure: React.FC<{ label: string; value: number; tone?: 'bad' | 'warn' }> = ({ label, value, tone }) => (
  <div className="px-4 py-4 first:pl-0">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className={`font-display text-3xl font-bold mt-1 ${value > 0 && tone === 'bad' ? 'text-destructive' : value > 0 && tone === 'warn' ? 'text-warning' : ''}`}>
      {value.toLocaleString('en-GB')}
    </dd>
  </div>
);

const DailyChart: React.FC<{ rows: { label: string; qty: number }[]; unit: string }> = ({ rows, unit }) => {
  const W = 640, H = 200, padL = 40, padB = 24, padT = 8;
  const max = Math.max(1, ...rows.map(r => r.qty));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const bw = (W - padL) / rows.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${unit} per day, last ${rows.length} days`}>
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={padL} x2={W} y1={y(top * f)} y2={y(top * f)} className="stroke-border" strokeWidth={1} />
          <text x={padL - 6} y={y(top * f) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
            {Math.round(top * f).toLocaleString('en-GB')}
          </text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r.label}>
          <rect x={padL + i * bw + 4} y={y(r.qty)} width={bw - 8} height={Math.max(0, H - padB - y(r.qty))} className="fill-primary">
            <title>{`${r.label}: ${r.qty} units`}</title>
          </rect>
          {i % 2 === 0 && (
            <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{r.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ drugs, transactionLogs }) => {
  const [series, setSeries] = useState<'dispensed' | 'received'>('dispensed');

  const flags = useMemo(() => attentionList(drugs), [drugs]);
  const expired = flags.filter(f => f.status.startsWith('Expired')).length;
  const expiring = flags.filter(f => f.status.startsWith('Expires')).length;
  const low = flags.filter(f => f.status === 'Low stock').length;
  const onHand = drugs.reduce((s, d) => s + (d.expiryDate > Date.now() ? d.quantity : 0), 0);

  const dispensed = sumUnits(transactionLogs, ['DISPENSE_DRUG']);
  const received = sumUnits(transactionLogs, RECEIVED);
  const writtenOff = sumUnits(transactionLogs, ['WRITE_OFF']);

  const daily = useMemo(
    () => dailyTotals(transactionLogs, series === 'dispensed' ? ['DISPENSE_DRUG'] : RECEIVED),
    [transactionLogs, series],
  );
  const top = useMemo(() => topDispensed(transactionLogs), [transactionLogs]);
  const recent = useMemo(
    () => [...transactionLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [transactionLogs],
  );

  return (
    <div className="space-y-12">
      <header>
        <h2 className="font-display text-2xl font-bold">Stock position</h2>
        <p className="text-muted-foreground mt-1">
          Worked out from {transactionLogs.length.toLocaleString('en-GB')} movements recorded on-chain, so these figures match the audit log.
        </p>
      </header>

      <dl className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 border-y divide-x">
        <Figure label="Units in date" value={onHand} />
        <Figure label="Received" value={received} />
        <Figure label="Dispensed" value={dispensed} />
        <Figure label="Written off" value={writtenOff} />
        <Figure label="Expired, on shelf" value={expired} tone="bad" />
        <Figure label={`Expiring in ${EXPIRY_WINDOW_DAYS} days`} value={expiring} tone="warn" />
        <Figure label={`Under ${LOW_STOCK_UNITS} units`} value={low} tone="warn" />
      </dl>

      <section aria-labelledby="attention">
        <h3 id="attention" className="font-display text-lg font-bold mb-3">Needs attention</h3>
        {flags.length === 0 ? (
          <p className="text-muted-foreground border-y py-6">Nothing is expired, close to expiry or running low.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">Drug</th>
                  <th className="py-2 pr-4 font-medium">Batch</th>
                  <th className="py-2 pr-4 font-medium">Reg. no.</th>
                  <th className="py-2 pr-4 font-medium text-right">Units</th>
                  <th className="py-2 font-medium">Issue</th>
                </tr>
              </thead>
              <tbody>
                {flags.map(f => (
                  <tr key={`${f.drug.id}-${f.status}`} className="border-b">
                    <td className="py-2.5 pr-4 font-medium">{f.drug.name}</td>
                    <td className="py-2.5 pr-4">{f.drug.batchNumber}</td>
                    <td className="py-2.5 pr-4">{f.drug.registrationNumber}</td>
                    <td className="py-2.5 pr-4 text-right">{f.drug.quantity.toLocaleString('en-GB')}</td>
                    <td className={`py-2.5 font-medium ${f.tone === 'bad' ? 'text-destructive' : 'text-warning'}`}>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="daily">
          <div className="flex items-center justify-between mb-3">
            <h3 id="daily" className="font-display text-lg font-bold">Last 14 days</h3>
            <div className="inline-flex border rounded-md overflow-hidden text-sm" role="group" aria-label="Chart series">
              {(['dispensed', 'received'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={series === s}
                  onClick={() => setSeries(s)}
                  className={`px-3 py-1.5 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${series === s ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <DailyChart rows={daily} unit={series === 'dispensed' ? 'Units dispensed' : 'Units received'} />
        </section>

        <section aria-labelledby="top">
          <h3 id="top" className="font-display text-lg font-bold mb-3">Most dispensed</h3>
          {top.length === 0 ? (
            <p className="text-muted-foreground border-y py-6">No dispensing recorded yet.</p>
          ) : (
            <ol className="border-t">
              {top.map(([name, qty]) => (
                <li key={name} className="border-b py-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span>{qty.toLocaleString('en-GB')}</span>
                  </div>
                  <div className="h-1 bg-muted mt-1.5" aria-hidden="true">
                    <div className="h-full bg-primary" style={{ width: `${(qty / top[0][1]) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-labelledby="recent">
        <h3 id="recent" className="font-display text-lg font-bold mb-3">Latest movements</h3>
        {recent.length === 0 ? (
          <p className="text-muted-foreground border-y py-6">No movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Drug</th>
                  <th className="py-2 pr-4 font-medium text-right">Units</th>
                  <th className="py-2 pr-4 font-medium">By</th>
                  <th className="py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(l => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2.5 pr-4 whitespace-nowrap" title={new Date(l.timestamp).toLocaleString('en-GB')}>{relativeTime(l.timestamp)}</td>
                    <td className="py-2.5 pr-4">{ACTION_LABEL[l.type] ?? l.type}</td>
                    <td className="py-2.5 pr-4">{l.drugName || '-'}</td>
                    <td className="py-2.5 pr-4 text-right">{l.quantity ? l.quantity.toLocaleString('en-GB') : '-'}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs" title={l.performer}>{shortAddr(l.performer)}</td>
                    <td className="py-2.5 text-muted-foreground">{l.reason || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
