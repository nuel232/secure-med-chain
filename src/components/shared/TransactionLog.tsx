import { motion } from 'framer-motion';
import { Plus, Minus, ExternalLink, Clock } from 'lucide-react';
import { TransactionLog as TransactionLogType } from '@/contexts/BlockchainContext';
import { cn } from '@/lib/utils';

interface TransactionLogProps {
  log: TransactionLogType;
  index: number;
}

export const TransactionLogCard = ({ log, index }: TransactionLogProps) => {
  const isAddDrug = log.type === 'ADD_DRUG';

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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative flex gap-4 pb-6"
    >
      {/* Timeline line */}
      <div className="absolute left-5 top-10 h-full w-px bg-border group-last:hidden" />
      
      {/* Icon */}
      <div className={cn(
        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        isAddDrug ? "bg-success/10" : "bg-primary/10"
      )}>
        {isAddDrug ? (
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
              {isAddDrug ? 'Drug Added' : 'Drug Dispensed'}
            </h4>
            <p className="text-sm text-muted-foreground">{log.drugName}</p>
          </div>
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            isAddDrug 
              ? "bg-success/10 text-success" 
              : "bg-primary/10 text-primary"
          )}>
            {isAddDrug ? '+' : '-'}{log.quantity} units
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(log.timestamp)}</span>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">Performer</span>
            <span className="font-mono text-xs text-foreground">
              {truncateAddress(log.performer)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">Tx Hash</span>
            <a
              href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
            >
              {truncateHash(log.txHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
