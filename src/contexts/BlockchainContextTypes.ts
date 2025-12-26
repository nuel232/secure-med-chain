import { createContext } from 'react';

export interface Drug {
  id: number;
  name: string;
  quantity: number;
  expiryDate: number; // Unix timestamp
  addedBy: string;
  timestamp: number;
}

export interface TransactionLog {
  id: string;
  type: 'ADD_DRUG' | 'DISPENSE_DRUG';
  drugId: number;
  drugName: string;
  quantity: number;
  performer: string;
  timestamp: number;
  txHash: string;
}

export type UserRole = 'admin' | 'pharmacy' | null;

export interface BlockchainContextType {
  isConnected: boolean;
  account: string | null;
  role: UserRole;
  drugs: Drug[];
  transactionLogs: TransactionLog[];
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  addDrug: (name: string, quantity: number, expiryDate: Date) => Promise<boolean>;
  dispenseDrug: (drugId: number, quantity: number) => Promise<boolean>;
  setRole: (role: UserRole) => void;
}

export const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);
