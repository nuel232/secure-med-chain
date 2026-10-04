import { useState } from 'react';
import { ethers } from 'ethers';
import { UserPlus, UserMinus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useToast } from '@/hooks/use-toast';

/** Admin-only: manage who may dispense, and hand the admin role to someone else. */
export const StaffManagement = () => {
  const { staff, grantStaff, revokeStaff, proposeAdmin, account } = useBlockchain();
  const { toast } = useToast();
  const [newStaff, setNewStaff] = useState('');
  const [newAdmin, setNewAdmin] = useState('');

  const validAddress = (value: string) => {
    if (!ethers.isAddress(value)) {
      toast({ title: 'Invalid address', description: 'Enter a valid 0x wallet address', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleGrant = async () => {
    const addr = newStaff.trim();
    if (!validAddress(addr)) return;
    if (await grantStaff(addr)) {
      toast({ title: 'Access granted', description: 'This wallet can now dispense drugs' });
      setNewStaff('');
    }
  };

  const handleRevoke = async (addr: string) => {
    if (await revokeStaff(addr)) toast({ title: 'Access revoked' });
  };

  const handlePropose = async () => {
    const addr = newAdmin.trim();
    if (!validAddress(addr)) return;
    if (addr.toLowerCase() === account?.toLowerCase()) {
      toast({ title: 'That is your own address', variant: 'destructive' });
      return;
    }
    const ok = window.confirm(
      `Propose ${addr} as the new admin?\n\nYou stay admin until that wallet connects and accepts. Check the address carefully.`,
    );
    if (ok && (await proposeAdmin(addr))) {
      toast({
        title: 'Admin transfer proposed',
        description: 'The new admin must connect their wallet and accept the role.',
      });
      setNewAdmin('');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pharmacy staff</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Only wallets listed here (and the admin) can dispense drugs. Everyone else is read-only.
        </p>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="staff-address" className="sr-only">Wallet address</Label>
            <Input
              id="staff-address"
              placeholder="0x… wallet address"
              value={newStaff}
              onChange={(e) => setNewStaff(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleGrant}>Grant access</Button>
        </div>

        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff authorized yet.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((addr) => (
              <li key={addr} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="font-mono text-xs text-foreground break-all">{addr}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(addr)}>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Transfer admin role</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Two steps: you propose a wallet, then that wallet connects and accepts. A mistyped address can't
          lock you out because you remain admin until it accepts.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="0x… new admin address"
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            className="font-mono text-sm"
          />
          <Button variant="secondary" onClick={handlePropose}>Propose</Button>
        </div>
      </section>
    </div>
  );
};
