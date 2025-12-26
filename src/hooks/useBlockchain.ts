import { useContext } from 'react';
import { BlockchainContext, type BlockchainContextType } from '@/contexts/BlockchainContextTypes';

/**
 * Hook to use the Blockchain context
 * Must be used within a BlockchainProvider
 */
export const useBlockchain = (): BlockchainContextType => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};
