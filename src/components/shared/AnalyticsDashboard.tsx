import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransactionLog, Drug } from '@/contexts/BlockchainContextTypes';
import {
  TrendingUp, TrendingDown, AlertTriangle, Pill, Activity,
  Package, Clock, BarChart2, Zap, ChevronRight, ShieldAlert,
  Calendar, Hash, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  drugs: Drug[];
  transactionLogs: TransactionLog[];
}

// ─── DATA HELPERS ────────────────────────────────────────────────────────────

function getTotalDispensed(logs: TransactionLog[]) {
  return logs
    .filter(l => l.type === 'DISPENSE_DRUG')
    .reduce((s, l) => s + l.quantity, 0);
}

function getTotalAdded(logs: TransactionLog[]) {
  return logs
    .filter(l => l.type === 'ADD_DRUG' || l.type === 'BATCH_IMPORT')
    .reduce((s, l) => s + l.quantity, 0);
}

function getExpiringSoon(drugs: Drug[], days = 30) {
  const now = Date.now();
  return drugs.filter(d => d.expiryDate > now && d.expiryDate < now + days * 86400000);
}

function getExpiredDrugs(drugs: Drug[]) {
  return drugs.filter(d => d.expiryDate < Date.now());
}

function getLowStock(drugs: Drug[], threshold = 100) {
  return drugs.filter(d => d.quantity > 0 && d.quantity <= threshold && d.expiryDate > Date.now());
}

function getTopDispensedDrugs(logs: TransactionLog[], n = 7) {
  const counts: Record<string, number> = {};
  logs.forEach(l => {
    if (l.type === 'DISPENSE_DRUG') counts[l.drugName] = (counts[l.drugName] || 0) + l.quantity;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function getTopAddedDrugs(logs: TransactionLog[], n = 7) {
  const counts: Record<string, number> = {};
  logs.forEach(l => {
    if (l.type === 'ADD_DRUG' || l.type === 'BATCH_IMPORT') {
      counts[l.drugName] = (counts[l.drugName] || 0) + l.quantity;
    }
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function getDispensingTrend(logs: TransactionLog[], days = 14) {
  const trend: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend[d.toISOString().split('T')[0]] = 0;
  }
  logs.forEach(l => {
    if (l.type === 'DISPENSE_DRUG') {
      const key = new Date(l.timestamp).toISOString().split('T')[0];
      if (key in trend) trend[key] += l.quantity;
    }
  });
  return Object.entries(trend).map(([date, qty]) => ({ date, qty }));
}

function getAdditionTrend(logs: TransactionLog[], days = 14) {
  const trend: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend[d.toISOString().split('T')[0]] = 0;
  }
  logs.forEach(l => {
    if (l.type === 'ADD_DRUG' || l.type === 'BATCH_IMPORT') {
      const key = new Date(l.timestamp).toISOString().split('T')[0];
      if (key in trend) trend[key] += l.quantity;
    }
  });
  return Object.entries(trend).map(([date, qty]) => ({ date, qty }));
}

function getActivityHeatmap(logs: TransactionLog[]) {
  const hours: number[] = new Array(24).fill(0);
  logs.forEach(l => {
    const h = new Date(l.timestamp).getHours();
    hours[h]++;
  });
  return hours;
}

function getTurnoverRate(logs: TransactionLog[]) {
  const dispensed = getTotalDispensed(logs);
  const added = getTotalAdded(logs);
  if (added === 0) return 0;
  return Math.min(((dispensed / added) * 100), 100);
}

function getRecentActivity(logs: TransactionLog[], n = 8) {
  return [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, n);
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const KPICard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;   // tailwind colour token e.g. "blue"
  delay: number;
  delta?: { value: number; label: string };
  subtext?: string;
}> = ({ label, value, icon, accent, delay, delta, subtext }) => {
  const accentMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-500',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-500',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-500',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-500',
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-500',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-500',
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120, damping: 14 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cls} p-5 backdrop-blur-sm`}
    >
      {/* background glow blob */}
      <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-current opacity-10 blur-2xl`} />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-current/10`}>
            {icon}
          </div>
        </div>

        <div>
          <span className="text-3xl font-black tabular-nums text-foreground">{value}</span>
          {subtext && (
            <span className="ml-1.5 text-xs text-muted-foreground">{subtext}</span>
          )}
        </div>

        {delta && (
          <div className="flex items-center gap-1 text-xs">
            {delta.value >= 0 ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-rose-500" />
            )}
            <span className={delta.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {Math.abs(delta.value)}%
            </span>
            <span className="text-muted-foreground">{delta.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Animated horizontal bar
const HBar: React.FC<{ label: string; value: number; max: number; rank: number; color: string }> = ({
  label, value, max, rank, color,
}) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-400',
    emerald: 'from-emerald-500 to-emerald-400',
    violet: 'from-violet-500 to-violet-400',
    amber: 'from-amber-500 to-amber-400',
  };
  const grad = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.06 }}
      className="flex items-center gap-3 group"
    >
      <span className="w-5 text-center text-xs font-bold text-muted-foreground/60">
        {rank + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-xs">
          <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
            {label}
          </span>
          <span className="ml-2 shrink-0 font-bold tabular-nums text-foreground">{value}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: rank * 0.06 + 0.25, duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${grad}`}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Mini sparkline bar chart
const SparkBars: React.FC<{
  data: Array<{ date: string; qty: number }>;
  color: string;
  label: string;
}> = ({ data, color, label }) => {
  const max = Math.max(...data.map(d => d.qty), 1);
  const colorMap: Record<string, { bar: string; hover: string }> = {
    blue: { bar: 'bg-blue-500/70', hover: 'bg-blue-500' },
    emerald: { bar: 'bg-emerald-500/70', hover: 'bg-emerald-500' },
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex h-20 items-end gap-[3px]">
        {data.map((item, i) => {
          const h = Math.max((item.qty / max) * 100, item.qty > 0 ? 8 : 3);
          return (
            <motion.div
              key={item.date}
              className="relative flex-1 group cursor-default"
              style={{ height: `${h}%` }}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
            >
              <div
                className={`h-full w-full rounded-sm ${cls.bar} group-hover:${cls.hover} transition-colors`}
              />
              {item.qty > 0 && (
                <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1 py-0.5 text-[10px] font-bold text-background opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.qty}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>{formatShortDate(data[0]?.date || '')}</span>
        <span>{formatShortDate(data[data.length - 1]?.date || '')}</span>
      </div>
    </div>
  );
};

// Radial progress ring
const RadialRing: React.FC<{ pct: number; size?: number; stroke?: number; color: string; label: string }> = ({
  pct, size = 80, stroke = 7, color, label,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    violet: '#8b5cf6',
  };
  const stroke_color = colorMap[color] || colorMap.blue;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="currentColor" strokeWidth={stroke}
            className="text-secondary"
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={stroke_color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center gap-1">
          <div className="text-lg font-black tabular-nums text-foreground">{Math.round(pct)}%</div>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground text-center">{label}</p>
    </div>
  );
};

// Hour heatmap strip
const HourHeatmap: React.FC<{ hours: number[] }> = ({ hours }) => {
  const max = Math.max(...hours, 1);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Activity by Hour of Day
      </p>
      <div className="flex gap-0.5">
        {hours.map((v, h) => {
          const intensity = v / max;
          return (
            <motion.div
              key={h}
              className="group relative flex-1 cursor-default"
              title={`${h}:00 — ${v} txns`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: h * 0.02 }}
            >
              <div
                className="h-6 rounded-sm transition-all"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.07 + intensity * 0.85})`,
                  transform: `scaleY(${0.3 + intensity * 0.7})`,
                  transformOrigin: 'bottom',
                }}
              />
              {v > 0 && (
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1 py-0.5 text-[10px] font-bold text-background opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {h}:00 · {v}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
};

// Expiry timeline list
const ExpiryTimeline: React.FC<{ drugs: Drug[] }> = ({ drugs }) => {
  const now = Date.now();
  const sorted = [...drugs]
    .filter(d => d.expiryDate > now)
    .sort((a, b) => a.expiryDate - b.expiryDate)
    .slice(0, 8);

  if (sorted.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">All drugs have valid expiry dates</p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((drug, i) => {
        const daysLeft = Math.ceil((drug.expiryDate - now) / 86400000);
        const urgency = daysLeft <= 7 ? 'rose' : daysLeft <= 30 ? 'amber' : 'emerald';
        const urgencyMap: Record<string, string> = {
          rose: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
          amber: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
          emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        };
        return (
          <motion.div
            key={drug.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{drug.name}</p>
              <p className="text-xs text-muted-foreground">
                {drug.quantity.toLocaleString()} units ·{' '}
                {new Date(drug.expiryDate).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${urgencyMap[urgency]}`}
            >
              {daysLeft}d
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

// Recent activity feed
const ActivityFeed: React.FC<{ logs: TransactionLog[] }> = ({ logs }) => {
  const recent = getRecentActivity(logs, 8);

  if (recent.length === 0)
    return <p className="text-center text-sm text-muted-foreground py-6">No transactions yet</p>;

  return (
    <div className="space-y-2">
      {recent.map((log, i) => {
        const isAdd = log.type === 'ADD_DRUG' || log.type === 'BATCH_IMPORT';
        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                isAdd ? 'bg-emerald-500/15 text-emerald-500' : 'bg-blue-500/15 text-blue-500'
              }`}
            >
              {isAdd ? <Package className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {isAdd ? '+ Added' : '− Dispensed'}&nbsp;
                <span className="font-bold">{log.quantity}</span> ×{' '}
                <span className="italic">{log.drugName}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatRelativeTime(log.timestamp)} ·{' '}
                {log.performer.slice(0, 6)}…{log.performer.slice(-4)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

type ChartTab = 'dispense' | 'addition';
type TopTab = 'dispensed' | 'added';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ drugs, transactionLogs }) => {
  const [chartTab, setChartTab] = useState<ChartTab>('dispense');
  const [topTab, setTopTab] = useState<TopTab>('dispensed');

  const totalDispensed = useMemo(() => getTotalDispensed(transactionLogs), [transactionLogs]);
  const totalAdded = useMemo(() => getTotalAdded(transactionLogs), [transactionLogs]);
  const expiringSoon = useMemo(() => getExpiringSoon(drugs, 30), [drugs]);
  const expiredDrugs = useMemo(() => getExpiredDrugs(drugs), [drugs]);
  const lowStock = useMemo(() => getLowStock(drugs, 100), [drugs]);
  const topDispensed = useMemo(() => getTopDispensedDrugs(transactionLogs, 7), [transactionLogs]);
  const topAdded = useMemo(() => getTopAddedDrugs(transactionLogs, 7), [transactionLogs]);
  const dispenseTrend = useMemo(() => getDispensingTrend(transactionLogs, 14), [transactionLogs]);
  const additionTrend = useMemo(() => getAdditionTrend(transactionLogs, 14), [transactionLogs]);
  const heatmap = useMemo(() => getActivityHeatmap(transactionLogs), [transactionLogs]);
  const turnover = useMemo(() => getTurnoverRate(transactionLogs), [transactionLogs]);

  const totalInventoryUnits = useMemo(() => drugs.reduce((s, d) => s + d.quantity, 0), [drugs]);
  const healthyDrugs = drugs.length - expiredDrugs.length;
  const healthPct = drugs.length > 0 ? (healthyDrugs / drugs.length) * 100 : 100;

  const topData = topTab === 'dispensed' ? topDispensed : topAdded;
  const topMax = Math.max(...topData.map(d => d[1] as number), 1);

  return (
    <div className="space-y-7 pb-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
      >
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Inventory Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live insights derived from on-chain transactions
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            {transactionLogs.length} txns · {drugs.length} SKUs
          </span>
        </div>
      </motion.div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Total Dispensed"
          value={totalDispensed.toLocaleString()}
          icon={<Activity className="h-5 w-5" />}
          accent="blue"
          delay={0}
          subtext="units"
        />
        <KPICard
          label="Total Added"
          value={totalAdded.toLocaleString()}
          icon={<Package className="h-5 w-5" />}
          accent="emerald"
          delay={0.06}
          subtext="units"
        />
        <KPICard
          label="Expiring Soon"
          value={expiringSoon.length}
          icon={<Clock className="h-5 w-5" />}
          accent="amber"
          delay={0.12}
          subtext="≤30 days"
        />
        <KPICard
          label="Expired"
          value={expiredDrugs.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="rose"
          delay={0.18}
          subtext="SKUs"
        />
        <KPICard
          label="Low Stock"
          value={lowStock.length}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="violet"
          delay={0.24}
          subtext="≤100 units"
        />
        <KPICard
          label="Total SKUs"
          value={drugs.length}
          icon={<Pill className="h-5 w-5" />}
          accent="cyan"
          delay={0.3}
          subtext={`${totalInventoryUnits.toLocaleString()} units`}
        />
      </div>

      {/* ── Row 2: Trend charts + Health gauges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend charts (span 2) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl border border-border/60 p-5 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">14-Day Trend</h3>
            </div>
            <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs font-medium">
              {(['dispense', 'addition'] as ChartTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setChartTab(t)}
                  className={`px-3 py-1.5 transition-colors ${
                    chartTab === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t === 'dispense' ? 'Dispensed' : 'Added'}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={chartTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SparkBars
                data={chartTab === 'dispense' ? dispenseTrend : additionTrend}
                color={chartTab === 'dispense' ? 'blue' : 'emerald'}
                label={chartTab === 'dispense' ? 'Units dispensed per day' : 'Units added per day'}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Gauge + health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl border border-border/60 p-6 flex flex-col gap-7"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Inventory Health</h3>
          </div>
          <div className="flex justify-around gap-6">
            <RadialRing
              pct={healthPct}
              size={88}
              stroke={8}
              color="emerald"
              label="Stock Health"
            />
            <RadialRing
              pct={turnover}
              size={88}
              stroke={8}
              color="blue"
              label="Turnover Rate"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-auto">
            {[
              { label: 'Healthy SKUs', value: healthyDrugs, color: 'text-emerald-500' },
              { label: 'Expired SKUs', value: expiredDrugs.length, color: 'text-rose-500' },
              { label: 'Near Expiry', value: expiringSoon.length, color: 'text-amber-500' },
              { label: 'Low Stock', value: lowStock.length, color: 'text-violet-500' },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-black tabular-nums ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Top drugs + Expiry timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top drugs bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-2xl border border-border/60 p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Top Drugs</h3>
            </div>
            <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs font-medium">
              {(['dispensed', 'added'] as TopTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTopTab(t)}
                  className={`px-3 py-1.5 transition-colors ${
                    topTab === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t === 'dispensed' ? 'Dispensed' : 'Added'}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={topTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {topData.length > 0 ? (
                topData.map(([name, qty], i) => (
                  <HBar
                    key={name}
                    label={name}
                    value={qty as number}
                    max={topMax}
                    rank={i}
                    color={topTab === 'dispensed' ? 'blue' : 'emerald'}
                  />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Expiry timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl border border-border/60 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Upcoming Expiries</h3>
          </div>
          <ExpiryTimeline drugs={drugs} />
        </motion.div>
      </div>

      {/* ── Row 4: Activity heatmap + Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card rounded-2xl border border-border/60 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Transaction Heatmap</h3>
          </div>
          <HourHeatmap hours={heatmap} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-2xl border border-border/60 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
          </div>
          <ActivityFeed logs={transactionLogs} />
        </motion.div>
      </div>

      {/* ── Alerts banner (only when needed) ── */}
      <AnimatePresence>
        {(expiredDrugs.length > 0 || expiringSoon.length > 0 || lowStock.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.65 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Inventory Alerts</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {expiredDrugs.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-sm font-semibold text-rose-600">
                    {expiredDrugs.length} expired SKU{expiredDrugs.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronRight className="h-3 w-3 text-rose-400" />
                  <span className="text-xs text-rose-500/80">Remove immediately</span>
                </div>
              )}
              {expiringSoon.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">
                    {expiringSoon.length} expiring within 30 days
                  </span>
                  <ChevronRight className="h-3 w-3 text-amber-400" />
                  <span className="text-xs text-amber-500/80">Prioritise dispensing</span>
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  <span className="text-sm font-semibold text-violet-600">
                    {lowStock.length} low-stock SKU{lowStock.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronRight className="h-3 w-3 text-violet-400" />
                  <span className="text-xs text-violet-500/80">Reorder soon</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalyticsDashboard;