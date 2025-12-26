import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import * as drugService from '@/services/drugInventoryService';
import { BlockchainContext, type BlockchainContextType, type UserRole, type Drug, type TransactionLog } from './BlockchainContextTypes';

// Simulated blockchain data (for demo purposes)
const generateTxHash = () => '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with sample data
  useEffect(() => {
    const sampleDrugs: Drug[] = [
      {
        id: 1,
        name: 'Paracetamol 500mg',
        quantity: 1000,
        expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
        addedBy: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
      },
      {
        id: 2,
        name: 'Amoxicillin 250mg',
        quantity: 500,
        expiryDate: Date.now() + 180 * 24 * 60 * 60 * 1000,
        addedBy: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      {
        id: 3,
        name: 'Ibuprofen 400mg',
        quantity: 750,
        expiryDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
        addedBy: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      },
      {
        id: 4,
        name: 'Expired Test Drug',
        quantity: 100,
        expiryDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        addedBy: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
      },
    ];

    const sampleLogs: TransactionLog[] = [
      {
        id: '1',
        type: 'ADD_DRUG',
        drugId: 1,
        drugName: 'Paracetamol 500mg',
        quantity: 1000,
        performer: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        txHash: generateTxHash(),
      },
      {
        id: '2',
        type: 'ADD_DRUG',
        drugId: 2,
        drugName: 'Amoxicillin 250mg',
        quantity: 500,
        performer: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
        txHash: generateTxHash(),
      },
      {
        id: '3',
        type: 'DISPENSE_DRUG',
        drugId: 1,
        drugName: 'Paracetamol 500mg',
        quantity: 50,
        performer: '0x8ba1f109551bD432803012645Hc136E7aF9bA36',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        txHash: generateTxHash(),
      },
    ];

    setDrugs(sampleDrugs);
    setTransactionLogs(sampleLogs);
  }, []);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      const ethereum = typeof window !== 'undefined' 
        ? (window as unknown as Record<string, unknown>).ethereum as ethers.Eip1193Provider | undefined
        : undefined;
      
      if (ethereum) {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          // Try to load drugs from smart contract
          try {
            const provider = new ethers.BrowserProvider(ethereum);
            const allDrugs = await drugService.getAllDrugs(provider);
            
            const mappedDrugs: Drug[] = allDrugs.map((drug: { id: string; name: string; quantity: string; expiryDate: string; addedBy: string }) => ({
              id: parseInt(drug.id),
              name: drug.name,
              quantity: parseInt(drug.quantity),
              expiryDate: parseInt(drug.expiryDate) * 1000, // Convert to ms
              addedBy: drug.addedBy,
              timestamp: Date.now(),
            }));
            
            setDrugs(mappedDrugs);
          } catch (err) {
            console.warn('Could not fetch drugs from contract:', err);
            // Keep sample data as fallback
          }
        }
      } else {
        // Simulate wallet connection for demo
        await new Promise(resolve => setTimeout(resolve, 1500));
        const simulatedAccount = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setAccount(simulatedAccount);
        setIsConnected(true);
      }
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setRole(null);
  }, []);

  const addDrug = useCallback(async (name: string, quantity: number, expiryDate: Date): Promise<boolean> => {
    if (role !== 'admin') {
      setError('Only admins can add drugs');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newDrug: Drug = {
        id: drugs.length + 1,
        name,
        quantity,
        expiryDate: expiryDate.getTime(),
        addedBy: account!,
        timestamp: Date.now(),
      };

      const newLog: TransactionLog = {
        id: String(transactionLogs.length + 1),
        type: 'ADD_DRUG',
        drugId: newDrug.id,
        drugName: name,
        quantity,
        performer: account!,
        timestamp: Date.now(),
        txHash: generateTxHash(),
      };

      setDrugs(prev => [...prev, newDrug]);
      setTransactionLogs(prev => [newLog, ...prev]);
      
      return true;
    } catch (err) {
      setError('Failed to add drug. Transaction reverted.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [role, account, drugs.length, transactionLogs.length]);

  const dispenseDrug = useCallback(async (drugId: number, quantity: number): Promise<boolean> => {
    if (role !== 'pharmacy') {
      setError('Only pharmacy staff can dispense drugs');
      return false;
    }

    const drug = drugs.find(d => d.id === drugId);
    if (!drug) {
      setError('Drug not found');
      return false;
    }

    if (drug.expiryDate < Date.now()) {
      setError('Cannot dispense expired drugs');
      return false;
    }

    if (drug.quantity < quantity) {
      setError('Insufficient quantity');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newLog: TransactionLog = {
        id: String(transactionLogs.length + 1),
        type: 'DISPENSE_DRUG',
        drugId,
        drugName: drug.name,
        quantity,
        performer: account!,
        timestamp: Date.now(),
        txHash: generateTxHash(),
      };

      setDrugs(prev => prev.map(d => 
        d.id === drugId ? { ...d, quantity: d.quantity - quantity } : d
      ));
      setTransactionLogs(prev => [newLog, ...prev]);

      return true;
    } catch (err) {
      setError('Failed to dispense drug. Transaction reverted.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [role, account, drugs, transactionLogs.length]);

  return (
    <BlockchainContext.Provider
      value={{
        isConnected,
        account,
        role,
        drugs,
        transactionLogs,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        addDrug,
        dispenseDrug,
        setRole,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};
