import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import * as drugService from '@/services/drugInventoryService';
import { BlockchainContext, type BlockchainContextType, type UserRole, type Drug, type TransactionLog } from './BlockchainContextTypes';

// ============================================
// CONFIGURATION - ONLY THING TO CHANGE
// ============================================
const CONTRACT_ADDRESS = '0x606C3b4e45EA9a4f11f58676A6D57609faE9035f'; // Update this after deployment

// ============================================
// TYPE DEFINITIONS
// ============================================

interface MetaMaskEthereum {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: MetaMaskEthereum;
  }
}

interface ContractDrug {
  id: string;
  name: string;
  quantity: string;
  expiryDate: string;
  addedBy: string;
  active: boolean;
}

// Sample data for demo purposes (used when contract is unavailable)
const SAMPLE_DRUGS: Drug[] = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    quantity: 1000,
    expiryDate: new Date('2026-12-31').getTime(),
    addedBy: '0x0000000000000000000000000000000000000000',
    timestamp: Date.now(),
  },
  {
    id: 2,
    name: 'Amoxicillin 250mg',
    quantity: 500,
    expiryDate: new Date('2026-06-30').getTime(),
    addedBy: '0x0000000000000000000000000000000000000000',
    timestamp: Date.now(),
  },
  {
    id: 3,
    name: 'Ibuprofen 400mg',
    quantity: 750,
    expiryDate: new Date('2026-03-31').getTime(),
    addedBy: '0x0000000000000000000000000000000000000000',
    timestamp: Date.now(),
  },
];

// ============================================
// BLOCKCHAIN PROVIDER COMPONENT
// ============================================

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  /**
   * Load drugs from blockchain
   */
  const loadDrugs = useCallback(async (providerInstance: ethers.BrowserProvider) => {
    try {
      console.log('📦 Loading drugs from blockchain...');
      const allDrugs = await drugService.getAllDrugs(providerInstance);
      
      // Check if response is valid (has drug IDs)
      if (!allDrugs[0] || allDrugs[0].length === 0) {
        console.warn('⚠️ No drugs found on contract. Using demo data.');
        setDrugs(SAMPLE_DRUGS);
        setError('Contract returned no drugs. Using demo data. Make sure the contract is deployed and has drugs added.');
        return;
      }
      
      console.log('✅ Drugs loaded:', allDrugs[0].length);
      
      const mappedDrugs: Drug[] = allDrugs[0].map((id: string | number, idx: number) => ({
        id: parseInt(String(id)),
        name: String(allDrugs[1][idx]),
        quantity: parseInt(String(allDrugs[2][idx])),
        expiryDate: parseInt(String(allDrugs[3][idx])) * 1000,
        addedBy: String(allDrugs[4][idx]),
        timestamp: Date.now(),
      }));
      
      setDrugs(mappedDrugs);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading drugs:', err);
      const error = err as Error;
      console.warn('⚠️ Falling back to demo data');
      setDrugs(SAMPLE_DRUGS);
      setError(`Contract error - using demo data. Error: ${error.message}`);
    }
  }, []);

  /**
   * Determine user role from blockchain
   * Smart contract handles all authorization logic
   */
  const determineRole = useCallback(async (
    address: string,
    providerInstance: ethers.BrowserProvider
  ): Promise<UserRole> => {
    try {
      console.log('🔍 Checking role for:', address);
      
      // Query smart contract for user's role
      const isAdminRole = await drugService.isAdmin(providerInstance, address);
      if (isAdminRole) {
        console.log('✅ User is Admin');
        return 'admin';
      }

      const isPharmacyRole = await drugService.isPharmacyStaff(providerInstance, address);
      if (isPharmacyRole) {
        console.log('✅ User is Pharmacy Staff');
        return 'pharmacy';
      }

      console.log('⚠️ No role assigned');
      return null;
    } catch (err) {
      console.error('❌ Error determining role:', err);
      return null;
    }
  }, []);

  /**
   * Connect to MetaMask wallet
   */
  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check MetaMask availability
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const ethereum = window.ethereum;
      console.log('🦊 Requesting MetaMask connection...');
      
      // Request account access
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect to MetaMask.');
      }

      const userAccount = accounts[0];
      console.log('✅ Connected to:', userAccount);
      
      // Create provider and signer
      const providerInstance = new ethers.BrowserProvider(ethereum);
      const signerInstance = await providerInstance.getSigner();

      // Get network info
      const network = await providerInstance.getNetwork();
      console.log('🌐 Network:', network.name, 'Chain ID:', network.chainId);

      setProvider(providerInstance);
      setSigner(signerInstance);
      setAccount(userAccount);
      setIsConnected(true);

      // Determine user role from blockchain
      const userRole = await determineRole(userAccount, providerInstance);
      setRole(userRole);

      // Load drugs from blockchain
      await loadDrugs(providerInstance);

      // Listen for account changes
      const handleAccountsChanged = async (newAccounts: unknown) => {
        const accountsArray = newAccounts as string[];
        if (accountsArray.length === 0) {
          // Account disconnected
          setIsConnected(false);
          setAccount(null);
          setRole(null);
          setProvider(null);
          setSigner(null);
          setDrugs([]);
          setTransactionLogs([]);
          setError(null);
        } else {
          const newAccount = accountsArray[0];
          console.log('🔄 Account changed to:', newAccount);
          setAccount(newAccount);
          const newRole = await determineRole(newAccount, providerInstance);
          setRole(newRole);
          await loadDrugs(providerInstance);
        }
      };

      const handleChainChanged = () => {
        console.log('🔄 Network changed, reloading...');
        window.location.reload();
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

    } catch (err) {
      const error = err as Error;
      console.error('❌ Wallet connection error:', error);
      setError(error.message || 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [determineRole, loadDrugs]);

  /**
   * Cleanup event listeners on unmount
   */
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setRole(null);
    setProvider(null);
    setSigner(null);
    setDrugs([]);
    setTransactionLogs([]);
    setError(null);
  }, []);

  /**
   * Add drug to inventory
   * Smart contract enforces admin-only access
   */
  const addDrug = useCallback(async (
    name: string,
    quantity: number,
    expiryDate: Date
  ): Promise<boolean> => {
    if (!signer) {
      setError('Wallet not connected');
      return false;
    }

    // Note: We don't check role here - smart contract handles authorization
    setIsLoading(true);
    setError(null);

    try {
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
      console.log('📝 Adding drug:', { name, quantity, expiryTimestamp });

      // Call smart contract - it will revert if user is not admin
      const receipt = await drugService.addDrug(
        signer,
        name,
        quantity,
        expiryTimestamp
      );

      console.log('✅ Drug added! TX:', receipt.hash);

      // Reload drugs from blockchain
      if (provider) {
        await loadDrugs(provider);
      }

      // Add to transaction logs
      const newLog: TransactionLog = {
        id: String(transactionLogs.length + 1),
        type: 'ADD_DRUG',
        drugId: drugs.length + 1,
        drugName: name,
        quantity,
        performer: account!,
        timestamp: Date.now(),
        txHash: receipt.hash || '',
      };
      setTransactionLogs(prev => [newLog, ...prev]);

      return true;
    } catch (err) {
      const error = err as Error & { message?: string; code?: string };
      console.error('❌ Error adding drug:', error);
      
      let errorMessage = 'Failed to add drug';
      if (error.message) {
        if (error.message.includes('Only admin')) {
          errorMessage = 'Only admins can add drugs';
        } else if (error.message.includes('user rejected') || error.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction was rejected';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, provider, drugs.length, transactionLogs.length, loadDrugs]);

  /**
   * Dispense drug from inventory
   * Smart contract enforces pharmacy-staff-only access
   */
  const dispenseDrug = useCallback(async (
    drugId: number,
    quantity: number
  ): Promise<boolean> => {
    if (!signer) {
      setError('Wallet not connected');
      return false;
    }

    const drug = drugs.find(d => d.id === drugId);
    if (!drug) {
      setError('Drug not found');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💊 Dispensing drug:', { drugId, quantity });

      // Call smart contract - it will revert if user is not pharmacy staff
      const receipt = await drugService.dispenseDrug(
        signer,
        drugId,
        quantity
      );

      console.log('✅ Drug dispensed! TX:', receipt.hash);

      // Reload drugs from blockchain
      if (provider) {
        await loadDrugs(provider);
      }

      // Add to transaction logs
      const newLog: TransactionLog = {
        id: String(transactionLogs.length + 1),
        type: 'DISPENSE_DRUG',
        drugId,
        drugName: drug.name,
        quantity,
        performer: account!,
        timestamp: Date.now(),
        txHash: receipt.hash || '',
      };
      setTransactionLogs(prev => [newLog, ...prev]);

      return true;
    } catch (err) {
      const error = err as Error & { message?: string; code?: string };
      console.error('❌ Error dispensing drug:', error);
      
      let errorMessage = 'Failed to dispense drug';
      if (error.message) {
        if (error.message.includes('Only pharmacy staff')) {
          errorMessage = 'Only pharmacy staff can dispense drugs';
        } else if (error.message.includes('expired')) {
          errorMessage = 'Cannot dispense expired drugs';
        } else if (error.message.includes('Insufficient')) {
          errorMessage = 'Insufficient quantity available';
        } else if (error.message.includes('user rejected') || error.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction was rejected';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, drugs, provider, transactionLogs.length, loadDrugs]);

  /**
   * Manual role setter (for testing only)
   * In production, roles are determined by smart contract
   */
  const setRoleManually = useCallback((newRole: UserRole) => {
    console.warn('⚠️ Setting role manually - only use for testing');
    setRole(newRole);
  }, []);

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
        setRole: setRoleManually,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};