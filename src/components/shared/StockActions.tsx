import { useState } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useToast } from '@/hooks/use-toast';
import type { Drug } from '@/contexts/BlockchainContextTypes';

/** Admin-only controls on a drug card: correct a stock count, or write off expired stock. */
export const StockActions = ({ drug }: { drug: Drug }) => {
  const { adjustQuantity, writeOffExpired } = useBlockchain();
  const { toast } = useToast();
  const [mode, setMode] = useState<'adjust' | 'writeoff' | null>(null);
  const [qty, setQty] = useState(String(drug.quantity));
  const [reason, setReason] = useState('');

  const isExpired = drug.expiryDate <= Date.now();
  const close = () => setMode(null);

  const submitAdjust = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0) {
      toast({ title: 'Error', description: 'Enter a whole number (0 or more)', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'A reason is required for every adjustment', variant: 'destructive' });
      return;
    }
    close();
    if (await adjustQuantity(drug.id, n, reason.trim())) {
      toast({ title: 'Success', description: `${drug.name} set to ${n} units` });
      setReason('');
    }
  };

  const submitWriteOff = async () => {
    close();
    if (await writeOffExpired(drug.id)) {
      toast({ title: 'Success', description: `Expired stock of ${drug.name} written off` });
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMode('adjust')}>
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Adjust stock
        </Button>
        {isExpired && drug.quantity > 0 && (
          <Button variant="destructive" size="sm" className="flex-1" onClick={() => setMode('writeoff')}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Write off
          </Button>
        )}
      </div>

      <Dialog open={mode === 'adjust'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock: {drug.name}</DialogTitle>
            <DialogDescription>
              Sets the available quantity (currently {drug.quantity}). The old and new values and your reason
              are recorded on-chain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor={`adj-qty-${drug.id}`}>New quantity</Label>
              <Input id={`adj-qty-${drug.id}`} type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`adj-reason-${drug.id}`}>Reason</Label>
              <Input
                id={`adj-reason-${drug.id}`}
                placeholder="e.g., Stock-take correction, damaged in storage"
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={submitAdjust}>
              Confirm adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'writeoff'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write off expired stock</DialogTitle>
            <DialogDescription>
              Sets {drug.name} (batch {drug.batchNumber}) to 0 units. The record and its history stay on-chain.
            </DialogDescription>
          </DialogHeader>
          <Button variant="destructive" className="w-full" onClick={submitWriteOff}>
            Write off {drug.quantity} units
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
