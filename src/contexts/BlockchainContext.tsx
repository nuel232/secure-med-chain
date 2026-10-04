import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import * as drugService from '@/services/drugInventoryService';
import { CONTRACT_ADDRESS, CONTRACT_CONFIGURED, SUPPORTED_CHAIN_IDS } from '@/config';
import {
  BlockchainContext,
  type Drug,
  type NewDrugInput,
  type TransactionLog,
  type UserRole,
} from './BlockchainContextTypes';

export type { Drug, TransactionLog, UserRole, NewDrugInput };

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

// Revert reasons from DrugInventory.sol. They are already human-readable, so show them as-is.
const CONTRACT_REVERTS = [
  'Only admin can perform this action',
  'Only authorized staff can perform this action',
  'Drug does not exist',
  'Zero address',
  'Already authorized',
  'Not authorized',
  'Not the pending admin',
  'Drug name cannot be empty',
  'Drug name too long',
  'Batch number required',
  'Batch number too long',
  'Registration number too long',
  'Quantity must be greater than 0',
  'Expiry date must be in the future',
  'Empty batch',
  'Batch too large',
  'Reason required',
  'Reason too long',
  'Drug has not expired',
  'Nothing to write off',
  'Cannot dispense expired drugs',
  'Insufficient quantity',
];

function friendlyError(err: unknown, fallback: string): string {
  const e = err as {
    code?: string;
    reason?: string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  const text = [e.reason, e.shortMessage, e.info?.error?.message, e.message].filter(Boolean).join(' | ');

  if (e.code === 'ACTION_REJECTED' || /user rejected/i.test(text)) return 'Transaction was rejected';
  if (/not been authorized by the user|"code": ?4100/.test(text)) {
    return 'Wallet not authorized. Reconnect MetaMask and approve account access.';
  }
  const known = CONTRACT_REVERTS.find((r) => text.includes(r));
  if (known) return known;
  return e.shortMessage || e.message || fallback;
}

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [isPendingAdmin, setIsPendingAdmin] = useState(false);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const listenersRef = useRef<{
    accountsChanged: (a: unknown) => void;
    chainChanged: () => void;
  } | null>(null);

  const detachListeners = useCallback(() => {
    const l = listenersRef.current;
    if (window.ethereum && l) {
      window.ethereum.removeListener('accountsChanged', l.accountsChanged);
      window.ethereum.removeListener('chainChanged', l.chainChanged);
    }
    listenersRef.current = null;
  }, []);

  const resetState = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setRole(null);
    setIsRoleLoading(false);
    setIsPendingAdmin(false);
    setProvider(null);
    setSigner(null);
    setDrugs([]);
    setTransactionLogs([]);
    setStaff([]);
    setError(null);
  }, []);

  /** Turn raw contract events into the UI's log shape. Multi-drug DrugAdded txs become one batch import. */
  const toTransactionLogs = (logs: drugService.AuditLog[]): TransactionLog[] => {
    const addsByTx = new Map<string, drugService.AuditLog[]>();
    logs.filter((l) => l.action === 'ADD').forEach((l) => {
      addsByTx.set(l.txHash, [...(addsByTx.get(l.txHash) ?? []), l]);
    });

    const out: TransactionLog[] = [];
    const seenBatchTx = new Set<string>();

    for (const l of logs) {
      const common = { performer: l.by, timestamp: l.timestamp, txHash: l.txHash, reason: l.reason };
      if (l.action === 'ADD') {
        const group = addsByTx.get(l.txHash) ?? [l];
        if (group.length > 1) {
          if (seenBatchTx.has(l.txHash)) continue;
          seenBatchTx.add(l.txHash);
          out.push({
            ...common,
            id: `${l.txHash}-batch`,
            type: 'BATCH_IMPORT',
            drugId: 0,
            drugName: `CSV import (${group.length} drugs)`,
            quantity: group.length,
            batchItems: group.map((g) => ({
              name: g.name,
              batchNumber: g.batchNumber ?? '',
              quantity: g.quantity,
              expiryDate: g.expiryDate ?? 0,
            })),
          });
        } else {
          out.push({ ...common, id: `${l.txHash}-${l.logIndex}`, type: 'ADD_DRUG', drugId: l.drugId, drugName: l.name, quantity: l.quantity });
        }
      } else {
        const type = {
          DISPENSE: 'DISPENSE_DRUG',
          ADJUST: 'ADJUST_STOCK',
          WRITE_OFF: 'WRITE_OFF',
          STAFF_GRANTED: 'STAFF_GRANTED',
          STAFF_REVOKED: 'STAFF_REVOKED',
        }[l.action] as TransactionLog['type'];
        out.push({ ...common, id: `${l.txHash}-${l.logIndex}`, type, drugId: l.drugId, drugName: l.name, quantity: l.quantity });
      }
    }
    return out;
  };

  /**
   * Load everything for the connected wallet. Failures are surfaced, never replaced with fake data:
   * a dashboard that silently shows sample inventory is worse than one that shows an error.
   */
  const loadChainData = useCallback(async (p: ethers.BrowserProvider, address: string) => {
    setIsRoleLoading(true);
    try {
      const info = await drugService.getRoleInfo(p, address);
      const newRole: UserRole = info.isAdmin ? 'admin' : info.isStaff ? 'pharmacy' : 'unauthorized';
      setRole(newRole);
      setIsPendingAdmin(info.isPendingAdmin);

      if (newRole === 'unauthorized') {
        setDrugs([]);
        setTransactionLogs([]);
        setStaff([]);
        return;
      }

      setDrugs(await drugService.getAllDrugs(p));

      try {
        setTransactionLogs(toTransactionLogs(await drugService.fetchAuditLogs(p)));
        setStaff(newRole === 'admin' ? await drugService.getStaffList(p) : []);
      } catch (e) {
        console.error('Error loading audit logs:', e);
        setError(
          'Inventory loaded, but the audit log could not be read. Check VITE_DEPLOY_BLOCK and your RPC provider.',
        );
      }
    } catch (e) {
      console.error('Error loading blockchain data:', e);
      setRole(null);
      setError(`Could not read the contract: ${friendlyError(e, 'unknown error')}`);
    } finally {
      setIsRoleLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (provider && account) await loadChainData(provider, account);
  }, [provider, account, loadChainData]);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setIsRoleLoading(true);
    setError(null);

    try {
      if (!CONTRACT_CONFIGURED) {
        throw new Error('VITE_CONTRACT_ADDRESS is not set. Copy .env.example to .env and set the deployed address.');
      }
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts.length === 0) throw new Error('No accounts found. Please connect to MetaMask.');

      const providerInstance = new ethers.BrowserProvider(ethereum);
      const network = await providerInstance.getNetwork();
      if (!SUPPORTED_CHAIN_IDS.includes(network.chainId)) {
        throw new Error(
          `Wrong network selected (chain ${network.chainId}). Switch MetaMask to Sepolia (11155111) or Localhost 8545 (31337).`,
        );
      }
      if (!(await drugService.isContractDeployed(providerInstance))) {
        throw new Error(
          `No contract found at ${CONTRACT_ADDRESS} on chain ${network.chainId}. Deploy it to this network or update VITE_CONTRACT_ADDRESS.`,
        );
      }

      const signerInstance = await providerInstance.getSigner();
      setProvider(providerInstance);
      setSigner(signerInstance);
      setAccount(accounts[0]);
      setIsConnected(true);
      await loadChainData(providerInstance, accounts[0]);

      detachListeners();
      const accountsChanged = async (next: unknown) => {
        const list = next as string[];
        if (list.length === 0) {
          resetState();
          return;
        }
        setAccount(list[0]);
        setRole(null);
        // The signer is bound to an address, so it must be re-created when the account changes.
        setSigner(await providerInstance.getSigner());
        await loadChainData(providerInstance, list[0]);
      };
      const chainChanged = () => window.location.reload();
      ethereum.on('accountsChanged', accountsChanged);
      ethereum.on('chainChanged', chainChanged);
      listenersRef.current = { accountsChanged, chainChanged };
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(friendlyError(err, 'Failed to connect wallet'));
      setIsConnected(false);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
      setIsLoading(false);
    }
  }, [loadChainData, detachListeners, resetState]);

  useEffect(() => detachListeners, [detachListeners]);

  const disconnectWallet = useCallback(() => {
    detachListeners();
    resetState();
  }, [detachListeners, resetState]);

  /** Run a signed transaction, then re-read chain state so the UI always reflects what is on-chain. */
  const run = useCallback(
    async (fallback: string, action: (s: ethers.Signer) => Promise<unknown>): Promise<boolean> => {
      if (!signer) {
        setError('Wallet not connected');
        return false;
      }
      setIsLoading(true);
      setError(null);
      try {
        await action(signer);
        if (provider && account) await loadChainData(provider, account);
        return true;
      } catch (err) {
        console.error(`${fallback}:`, err);
        setError(friendlyError(err, fallback));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, provider, account, loadChainData],
  );

  const addDrug = useCallback(
    (input: NewDrugInput) => run('Failed to add drug', (s) => drugService.addDrug(s, input)),
    [run],
  );
  const importDrugsBatch = useCallback(
    (rows: NewDrugInput[]) => run('Batch import failed', (s) => drugService.addDrugsBatch(s, rows)),
    [run],
  );
  const dispenseDrug = useCallback(
    (id: number, qty: number, reason: string) =>
      run('Failed to dispense drug', (s) => drugService.dispenseDrug(s, id, qty, reason)),
    [run],
  );
  const adjustQuantity = useCallback(
    (id: number, qty: number, reason: string) =>
      run('Failed to adjust quantity', (s) => drugService.adjustQuantity(s, id, qty, reason)),
    [run],
  );
  const writeOffExpired = useCallback(
    (id: number) => run('Failed to write off stock', (s) => drugService.writeOffExpired(s, id)),
    [run],
  );
  const grantStaff = useCallback(
    (addr: string) => run('Failed to grant access', (s) => drugService.grantStaff(s, addr)),
    [run],
  );
  const revokeStaff = useCallback(
    (addr: string) => run('Failed to revoke access', (s) => drugService.revokeStaff(s, addr)),
    [run],
  );
  const proposeAdmin = useCallback(
    (addr: string) => run('Failed to propose admin', (s) => drugService.proposeAdmin(s, addr)),
    [run],
  );
  const acceptAdmin = useCallback(
    () => run('Failed to accept admin role', (s) => drugService.acceptAdmin(s)),
    [run],
  );

  return (
    <BlockchainContext.Provider
      value={{
        isConnected,
        account,
        role,
        isRoleLoading,
        isPendingAdmin,
        drugs,
        transactionLogs,
        staff,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        refresh,
        addDrug,
        importDrugsBatch,
        dispenseDrug,
        adjustQuantity,
        writeOffExpired,
        grantStaff,
        revokeStaff,
        proposeAdmin,
        acceptAdmin,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};
