import { motion } from 'framer-motion';
import { Shield, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { account, role, disconnectWallet } = useBlockchain();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">MediChain</h1>
            <p className="text-xs text-muted-foreground">Drug Inventory System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {role && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
              <User className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium capitalize text-secondary-foreground">
                {role === 'admin' ? 'Admin' : 'Pharmacy Staff'}
              </span>
            </div>
          )}

          {account && (
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-mono text-muted-foreground">
                {truncateAddress(account)}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Disconnect</span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
};
