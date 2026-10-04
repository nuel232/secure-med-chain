import { createContext } from 'react';

export interface Drug {
  id: number;
  name: string;
  batchNumber: string;
  registrationNumber: string;
  quantity: number;
  expiryDate: number; // Unix timestamp (ms)
  addedBy: string;
  timestamp: number; // when it was added on-chain (ms)
}

export type LogType =
  | 'ADD_DRUG'
  | 'DISPENSE_DRUG'
  | 'BATCH_IMPORT'
  | 'ADJUST_STOCK'
  | 'WRITE_OFF'
  | 'STAFF_GRANTED'
  | 'STAFF_REVOKED';

export interface TransactionLog {
  id: string;
  type: LogType;
  drugId: number;
  drugName: string;
  quantity: number;
  performer: string;
  timestamp: number;
  txHash: string;
  reason?: string;
  batchItems?: Array<{
    name: string;
    batchNumber: string;
    quantity: number;
    expiryDate: number; // Unix timestamp (ms)
  }>;
}

/** 'unauthorized' = connected wallet that is neither admin nor whitelisted staff. */
export type UserRole = 'admin' | 'pharmacy' | 'unauthorized' | null;

/** `expiryDate` is YYYY-MM-DD; the context converts it to an on-chain timestamp. */
export interface NewDrugInput {
  name: string;
  batchNumber: string;
  registrationNumber: string;
  quantity: number;
  expiryDate: string;
}

export interface BlockchainContextType {
  isConnected: boolean;
  account: string | null;
  role: UserRole;
  isRoleLoading: boolean;
  isPendingAdmin: boolean;
  drugs: Drug[];
  transactionLogs: TransactionLog[];
  staff: string[];
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refresh: () => Promise<void>;
  addDrug: (input: NewDrugInput) => Promise<boolean>;
  importDrugsBatch: (rows: NewDrugInput[]) => Promise<boolean>;
  dispenseDrug: (drugId: number, quantity: number, reason: string) => Promise<boolean>;
  adjustQuantity: (drugId: number, newQuantity: number, reason: string) => Promise<boolean>;
  writeOffExpired: (drugId: number) => Promise<boolean>;
  grantStaff: (address: string) => Promise<boolean>;
  revokeStaff: (address: string) => Promise<boolean>;
  proposeAdmin: (address: string) => Promise<boolean>;
  acceptAdmin: () => Promise<boolean>;
}

export const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);
