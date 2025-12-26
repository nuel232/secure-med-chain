import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import * as drugService from '@/services/drugInventoryService';
import { BlockchainContext, type BlockchainContextType, type UserRole, type Drug, type TransactionLog } from './BlockchainContextTypes';

const CONTRACT_ADDRESS = '0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71';
// IMPORTANT: Replace this with the address that deployed the smart contract
const DEPLOYER_ADDRESS = '0x2d4f73d89645c5558126cea3489c79f9498b5a66'; // Your deployer address from the image

// Type for MetaMask's ethereum provider
interface MetaMaskEthereum {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: MetaMaskEthereum;
  }
}

// Type for drug data from smart contract
interface ContractDrug {
  id: string;
  name: string;
  quantity: string;
  expiryDate: string;
  addedBy: string;
  active: boolean;
}

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

  // Load drugs from blockchain
  const loadDrugs = useCallback(async (providerInstance: ethers.BrowserProvider) => {
    try {
      console.log('Loading drugs from blockchain...');
      const allDrugs = await drugService.getAllDrugs(providerInstance);
      console.log('Drugs loaded from blockchain:', allDrugs);
      
      const mappedDrugs: Drug[] = allDrugs.map((drug: ContractDrug) => ({
        id: parseInt(drug.id),
        name: drug.name,
        quantity: parseInt(drug.quantity),
        expiryDate: parseInt(drug.expiryDate) * 1000, // Convert to milliseconds
        addedBy: drug.addedBy,
        timestamp: Date.now(),
      }));
      
      setDrugs(mappedDrugs);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading drugs:', err);
      const error = err as Error;
      setError(`Failed to load drugs from blockchain: ${error.message}`);
    }
  }, []);

  // Determine user role from blockchain
  const determineRole = useCallback(async (
    address: string,
    providerInstance: ethers.BrowserProvider
  ): Promise<UserRole> => {
    try {
      console.log('Determining role for address:', address);
      console.log('Deployer address:', DEPLOYER_ADDRESS);
      
      // Check if user is the deployer (contract deployer gets full admin access)
      if (address.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase()) {
        console.log('User is contract deployer - granting admin role');
        return 'admin';
      }

      // Check if user has admin role from contract
      const isAdminRole = await drugService.isAdmin(providerInstance, address);
      console.log('Is admin from contract:', isAdminRole);
      if (isAdminRole) {
        return 'admin';
      }

      // Check if user has pharmacy staff role
      const isPharmacyRole = await drugService.isPharmacyStaff(providerInstance, address);
      console.log('Is pharmacy staff from contract:', isPharmacyRole);
      if (isPharmacyRole) {
        return 'pharmacy';
      }

      console.log('No role assigned for this address');
      return null;
    } catch (err) {
      console.error('Error determining role:', err);
      return null;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const ethereum = window.ethereum;
      
      // Request account access
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect to MetaMask.');
      }

      const userAccount = accounts[0];
      console.log('Connected account:', userAccount);
      
      // Create provider and signer
      const providerInstance = new ethers.BrowserProvider(ethereum);
      const signerInstance = await providerInstance.getSigner();

      // Get network info
      const network = await providerInstance.getNetwork();
      console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);

      setProvider(providerInstance);
      setSigner(signerInstance);
      setAccount(userAccount);
      setIsConnected(true);

      // Determine user role from blockchain
      const userRole = await determineRole(userAccount, providerInstance);
      console.log('User role determined:', userRole);
      setRole(userRole);

      // Load drugs from blockchain (even if no role, to show connection works)
      await loadDrugs(providerInstance);

      // Listen for account changes
      const handleAccountsChanged = async (newAccounts: unknown) => {
        const accountsArray = newAccounts as string[];
        if (accountsArray.length === 0) {
          // User disconnected wallet
          disconnectWallet();
        } else {
          // User switched accounts
          const newAccount = accountsArray[0];
          console.log('Account changed to:', newAccount);
          setAccount(newAccount);
          const newRole = await determineRole(newAccount, providerInstance);
          setRole(newRole);
          await loadDrugs(providerInstance);
        }
      };

      const handleChainChanged = () => {
        console.log('Chain changed, reloading...');
        window.location.reload();
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

    } catch (err) {
      const error = err as Error;
      console.error('Wallet connection error:', error);
      setError(error.message || 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [determineRole, loadDrugs]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        // Remove all listeners when component unmounts
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

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

  const addDrug = useCallback(async (
    name: string,
    quantity: number,
    expiryDate: Date
  ): Promise<boolean> => {
    if (!signer) {
      setError('Wallet not connected');
      return false;
    }

    if (role !== 'admin') {
      setError('Only admins can add drugs');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert date to Unix timestamp
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);

      console.log('Adding drug to blockchain:', { name, quantity, expiryTimestamp });

      // Call smart contract function
      const receipt = await drugService.addDrug(
        signer,
        name,
        quantity,
        expiryTimestamp
      );

      console.log('Drug added successfully! Transaction:', receipt.hash);

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
      console.error('Error adding drug:', error);
      
      // Parse error message
      let errorMessage = 'Failed to add drug';
      if (error.message) {
        if (error.message.includes('Only admin')) {
          errorMessage = 'Only admin can add drugs';
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
  }, [signer, role, account, provider, drugs.length, transactionLogs.length, loadDrugs]);

  const dispenseDrug = useCallback(async (
    drugId: number,
    quantity: number
  ): Promise<boolean> => {
    if (!signer) {
      setError('Wallet not connected');
      return false;
    }

    if (role !== 'pharmacy') {
      setError('Only pharmacy staff can dispense drugs');
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
      console.log('Dispensing drug from blockchain:', { drugId, quantity });

      // Call smart contract function
      const receipt = await drugService.dispenseDrug(
        signer,
        drugId,
        quantity
      );

      console.log('Drug dispensed successfully! Transaction:', receipt.hash);

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
      console.error('Error dispensing drug:', error);
      
      // Parse error message
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
  }, [signer, role, account, drugs, provider, transactionLogs.length, loadDrugs]);

  // Manual role setter (should only be used for testing)
  const setRoleManually = useCallback((newRole: UserRole) => {
    console.warn('Setting role manually - this should only be used for testing');
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