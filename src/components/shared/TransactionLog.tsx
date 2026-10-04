import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ExternalLink, Clock } from 'lucide-react';
import type { TransactionLog as TransactionLogType } from '@/contexts/BlockchainContextTypes';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TransactionLogProps {
  log: TransactionLogType;
  index: number;
}

const LOG_LABELS: Record<TransactionLogType['type'], string> = {
  ADD_DRUG: 'Drug Added',
  BATCH_IMPORT: 'Batch Import',
  DISPENSE_DRUG: 'Drug Dispensed',
  ADJUST_STOCK: 'Stock Adjusted',
  WRITE_OFF: 'Expired Stock Written Off',
  STAFF_GRANTED: 'Staff Access Granted',
  STAFF_REVOKED: 'Staff Access Revoked',
};

export const TransactionLogCard = ({ log, index }: TransactionLogProps) => {
  const isAddDrug = log.type === 'ADD_DRUG';
  const isBatchImport = log.type === 'BATCH_IMPORT';
  const label = LOG_LABELS[log.type];
  const isStaffEvent = log.type === 'STAFF_GRANTED' || log.type === 'STAFF_REVOKED';
  const quantityLabel = isBatchImport
    ? `${log.quantity} drugs`
    : isStaffEvent
      ? ''
      : log.type === 'ADJUST_STOCK'
        ? `now ${log.quantity} units`
        : `${isAddDrug ? '+' : '-'}${log.quantity} units`;
  const [open, setOpen] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const batchDrugs = useMemo(() => {
    if (!log.batchItems?.length) return [];
    return log.batchItems;
  }, [log.batchItems]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {label} Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-sm text-muted-foreground">Performer</div>
              <div className="font-mono text-xs text-foreground">
                {truncateAddress(log.performer)}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-sm text-muted-foreground">Timestamp</div>
              <div className="text-sm text-foreground">{formatDate(log.timestamp)}</div>
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Tx Hash</div>
                <div className="font-mono text-xs text-foreground">{truncateHash(log.txHash)}</div>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {isBatchImport && batchDrugs.length > 0 ? (
              <div>
                <div className="mb-2 font-medium text-foreground">
                  Drugs included ({batchDrugs.length})
                </div>
                <div className="overflow-y-auto max-h-72 rounded-lg border border-border">
                  <div className="divide-y divide-border">
                    {batchDrugs.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date(item.expiryDate).toLocaleDateString('en-US')}
                          </div>
                        </div>
                        <div className="font-mono text-xs text-foreground whitespace-nowrap">
                          Qty: {item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                <div className="text-sm text-muted-foreground">Drug</div>
                <div className="mt-1 text-sm font-medium text-foreground">{log.drugName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Quantity: {log.quantity} units
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="group relative flex gap-4 pb-6 cursor-pointer"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(true);
        }}
        tabIndex={0}
        role="button"
      >
        {/* Timeline line */}
        <div className="absolute left-5 top-10 h-full w-px bg-border group-last:hidden" />

        {/* Icon */}
        <div
          className={cn(
            'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            isAddDrug || isBatchImport ? 'bg-success/10' : 'bg-primary/10',
          )}
        >
          {isAddDrug || isBatchImport ? (
            <Plus className="h-5 w-5 text-success" />
          ) : (
            <Minus className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="glass-card flex-1 rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-medium text-foreground">
                {label}
              </h4>
              <p className="text-sm text-muted-foreground">{log.drugName}</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                isAddDrug || isBatchImport ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
              )}
            >
              {quantityLabel}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(log.timestamp)}</span>
            </div>

            {log.reason && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Reason: </span>
                <span className="text-foreground">{log.reason}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Performer</span>
              <span className="font-mono text-xs text-foreground">{truncateAddress(log.performer)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Tx Hash</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                {truncateHash(log.txHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
