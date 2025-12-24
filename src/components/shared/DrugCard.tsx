import { motion } from 'framer-motion';
import { Pill, Calendar, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { Drug } from '@/contexts/BlockchainContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DrugCardProps {
  drug: Drug;
  onDispense?: (drug: Drug) => void;
  showDispenseButton?: boolean;
}

export const DrugCard = ({ drug, onDispense, showDispenseButton = false }: DrugCardProps) => {
  const isExpired = drug.expiryDate < Date.now();
  const isExpiringSoon = !isExpired && drug.expiryDate < Date.now() + 30 * 24 * 60 * 60 * 1000;
  const isLowStock = drug.quantity < 100;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = () => {
    if (isExpired) return 'border-destructive/50 bg-destructive/5';
    if (isExpiringSoon) return 'border-warning/50 bg-warning/5';
    return 'border-border hover:border-primary/30';
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </span>
      );
    }
    if (isExpiringSoon) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-foreground">
          <AlertTriangle className="h-3 w-3" />
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <CheckCircle className="h-3 w-3" />
        Available
      </span>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "glass-card rounded-xl p-5 transition-all duration-300",
        getStatusColor()
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            isExpired ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <Pill className={cn(
              "h-6 w-6",
              isExpired ? "text-destructive" : "text-primary"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{drug.name}</h3>
            <p className="text-sm text-muted-foreground">ID: #{drug.id}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-sm">Quantity</span>
          </div>
          <span className={cn(
            "font-semibold",
            isLowStock ? "text-warning" : "text-foreground"
          )}>
            {drug.quantity.toLocaleString()} units
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Expiry Date</span>
          </div>
          <span className={cn(
            "font-medium",
            isExpired ? "text-destructive" : isExpiringSoon ? "text-warning-foreground" : "text-foreground"
          )}>
            {formatDate(drug.expiryDate)}
          </span>
        </div>
      </div>

      {showDispenseButton && !isExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <Button
            onClick={() => onDispense?.(drug)}
            className="w-full"
            variant={isExpiringSoon ? "warning" : "default"}
          >
            Dispense Drug
          </Button>
        </motion.div>
      )}

      {isExpired && showDispenseButton && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-center">
          <p className="text-sm text-destructive font-medium">
            Cannot dispense expired drugs
          </p>
        </div>
      )}
    </motion.div>
  );
};
