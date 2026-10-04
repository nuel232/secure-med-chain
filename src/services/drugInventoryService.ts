import { ethers } from 'ethers';
import DrugInventoryABI from '@/Abi/DrugInventoryABI.json';
import { CONTRACT_ADDRESS, CONTRACT_CONFIGURED, DEPLOY_BLOCK } from '@/config';
import type { Drug, NewDrugInput } from '@/contexts/BlockchainContextTypes';
import { expiryToTimestamp } from '@/utils/dates';

type Runner = ethers.Provider | ethers.Signer;

/** Matches MAX_BATCH_SIZE in the contract. */
const MAX_BATCH_SIZE = 100;
const PAGE_SIZE = 100;

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

function getContract(runner: Runner) {
  if (!CONTRACT_CONFIGURED) {
    throw new Error(
      'VITE_CONTRACT_ADDRESS is not set. Copy .env.example to .env and set the deployed contract address.',
    );
  }
  return new ethers.Contract(CONTRACT_ADDRESS, DrugInventoryABI, runner);
}

function providerOf(signer: ethers.Signer): ethers.Provider {
  if (!signer.provider) throw new Error('Signer provider is unavailable');
  return signer.provider;
}

export async function isContractDeployed(provider: ethers.Provider): Promise<boolean> {
  if (!CONTRACT_CONFIGURED) return false;
  const code = await provider.getCode(CONTRACT_ADDRESS);
  return code !== '0x';
}

async function ensureDeployed(provider: ethers.Provider) {
  if (!(await isContractDeployed(provider))) {
    throw new Error(`No contract deployed at ${CONTRACT_ADDRESS} on the current network`);
  }
}

// ============ Reads (these THROW on failure; callers decide how to surface it) ============

export interface RoleInfo {
  isAdmin: boolean;
  isStaff: boolean;
  isPendingAdmin: boolean;
}

export async function getRoleInfo(provider: ethers.Provider, address: string): Promise<RoleInfo> {
  const c = getContract(provider);
  const [isAdmin, isStaff, pending] = await Promise.all([
    c.isAdmin(address) as Promise<boolean>,
    c.isPharmacyStaff(address) as Promise<boolean>,
    c.pendingAdmin() as Promise<string>,
  ]);
  return {
    isAdmin,
    isStaff,
    isPendingAdmin: pending !== ethers.ZeroAddress && pending.toLowerCase() === address.toLowerCase(),
  };
}

export async function getAllDrugs(provider: ethers.Provider): Promise<Drug[]> {
  const c = getContract(provider);
  const total = Number(await c.getTotalDrugs());
  const drugs: Drug[] = [];

  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const page = await c.getDrugs(offset, PAGE_SIZE);
    for (const d of page) {
      drugs.push({
        id: Number(d.id),
        name: d.name,
        batchNumber: d.batchNumber,
        registrationNumber: d.registrationNumber,
        quantity: Number(d.quantity),
        expiryDate: Number(d.expiryDate) * 1000,
        addedBy: d.addedBy,
        timestamp: Number(d.addedAt) * 1000,
      });
    }
  }
  return drugs;
}

export type AuditAction =
  | 'ADD'
  | 'DISPENSE'
  | 'ADJUST'
  | 'WRITE_OFF'
  | 'STAFF_GRANTED'
  | 'STAFF_REVOKED';

export interface AuditLog {
  action: AuditAction;
  drugId: number;
  name: string;
  batchNumber?: string;
  quantity: number;
  expiryDate?: number; // ms
  reason?: string;
  by: string;
  txHash: string;
  timestamp: number; // ms
  blockNumber: number;
  logIndex: number;
}

/**
 * Rebuild the full audit trail from contract events.
 * Most events carry their own `timestamp`; only the staff events need a block lookup.
 */
export async function fetchAuditLogs(provider: ethers.Provider): Promise<AuditLog[]> {
  const c = getContract(provider);
  const q = (name: string) => c.queryFilter(c.filters[name](), DEPLOY_BLOCK);

  const [added, dispensed, adjusted, writtenOff, granted, revoked] = await Promise.all([
    q('DrugAdded'),
    q('DrugDispensed'),
    q('QuantityAdjusted'),
    q('DrugWrittenOff'),
    q('StaffGranted'),
    q('StaffRevoked'),
  ]);

  const blockTimes = new Map<number, number>();
  const blockTime = async (n: number) => {
    if (!blockTimes.has(n)) {
      const b = await provider.getBlock(n);
      blockTimes.set(n, (b?.timestamp ?? 0) * 1000);
    }
    return blockTimes.get(n)!;
  };

  const base = (e: ethers.EventLog | ethers.Log) => ({
    txHash: e.transactionHash,
    blockNumber: e.blockNumber,
    logIndex: e.index,
  });
  const logs: AuditLog[] = [];

  for (const e of added as ethers.EventLog[]) {
    const a = e.args;
    logs.push({
      ...base(e),
      action: 'ADD',
      drugId: Number(a.id),
      name: a.name,
      batchNumber: a.batchNumber,
      quantity: Number(a.quantity),
      expiryDate: Number(a.expiryDate) * 1000,
      by: a.addedBy,
      timestamp: Number(a.timestamp) * 1000,
    });
  }
  for (const e of dispensed as ethers.EventLog[]) {
    const a = e.args;
    logs.push({
      ...base(e),
      action: 'DISPENSE',
      drugId: Number(a.drugId),
      name: a.drugName,
      quantity: Number(a.quantity),
      reason: a.reason,
      by: a.dispensedBy,
      timestamp: Number(a.timestamp) * 1000,
    });
  }
  for (const e of adjusted as ethers.EventLog[]) {
    const a = e.args;
    logs.push({
      ...base(e),
      action: 'ADJUST',
      drugId: Number(a.drugId),
      name: a.drugName,
      quantity: Number(a.newQuantity),
      reason: `${a.reason} (${a.oldQuantity} → ${a.newQuantity})`,
      by: a.adjustedBy,
      timestamp: Number(a.timestamp) * 1000,
    });
  }
  for (const e of writtenOff as ethers.EventLog[]) {
    const a = e.args;
    logs.push({
      ...base(e),
      action: 'WRITE_OFF',
      drugId: Number(a.drugId),
      name: a.drugName,
      quantity: Number(a.quantity),
      reason: 'Expired stock written off',
      by: a.writtenOffBy,
      timestamp: Number(a.timestamp) * 1000,
    });
  }
  for (const [events, action] of [
    [granted, 'STAFF_GRANTED'],
    [revoked, 'STAFF_REVOKED'],
  ] as const) {
    for (const e of events as ethers.EventLog[]) {
      logs.push({
        ...base(e),
        action,
        drugId: 0,
        name: e.args.staff,
        quantity: 0,
        by: e.args.by,
        timestamp: await blockTime(e.blockNumber),
      });
    }
  }

  logs.sort((x, y) => y.blockNumber - x.blockNumber || y.logIndex - x.logIndex);
  return logs;
}

/** Currently authorized staff: addresses ever granted, filtered by the contract's live state. */
export async function getStaffList(provider: ethers.Provider): Promise<string[]> {
  const c = getContract(provider);
  const granted = (await c.queryFilter(c.filters.StaffGranted(), DEPLOY_BLOCK)) as ethers.EventLog[];
  const unique = [...new Set(granted.map((e) => ethers.getAddress(e.args.staff)))];
  const live = await Promise.all(unique.map((a) => c.authorizedStaff(a) as Promise<boolean>));
  return unique.filter((_, i) => live[i]);
}

// ============ Writes (admin / staff). Each returns the mined receipt. ============

async function send(
  signer: ethers.Signer,
  call: (c: ethers.Contract) => Promise<ethers.ContractTransactionResponse>,
) {
  await ensureDeployed(providerOf(signer));
  const tx = await call(getContract(signer));
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error('Transaction failed');
  return receipt;
}

const toTuple = (d: NewDrugInput) => ({
  name: d.name,
  batchNumber: d.batchNumber,
  registrationNumber: d.registrationNumber,
  quantity: BigInt(d.quantity),
  expiryDate: BigInt(expiryToTimestamp(d.expiryDate)),
});

export function addDrug(signer: ethers.Signer, d: NewDrugInput) {
  const t = toTuple(d);
  return send(signer, (c) =>
    c.addDrug(t.name, t.batchNumber, t.registrationNumber, t.quantity, t.expiryDate),
  );
}

/** Splits into chunks of MAX_BATCH_SIZE (one transaction per chunk). */
export async function addDrugsBatch(signer: ethers.Signer, items: NewDrugInput[]) {
  if (items.length === 0) throw new Error('Batch is empty');
  const receipts = [];
  for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
    const chunk = items.slice(i, i + MAX_BATCH_SIZE).map(toTuple);
    receipts.push(await send(signer, (c) => c.addDrugsBatch(chunk)));
  }
  return receipts;
}

export const dispenseDrug = (signer: ethers.Signer, drugId: number, quantity: number, reason: string) =>
  send(signer, (c) => c.dispenseDrug(drugId, quantity, reason));

export const adjustQuantity = (signer: ethers.Signer, drugId: number, newQuantity: number, reason: string) =>
  send(signer, (c) => c.adjustQuantity(drugId, newQuantity, reason));

export const writeOffExpired = (signer: ethers.Signer, drugId: number) =>
  send(signer, (c) => c.writeOffExpired(drugId));

export const grantStaff = (signer: ethers.Signer, address: string) =>
  send(signer, (c) => c.grantStaff(address));

export const revokeStaff = (signer: ethers.Signer, address: string) =>
  send(signer, (c) => c.revokeStaff(address));

export const proposeAdmin = (signer: ethers.Signer, address: string) =>
  send(signer, (c) => c.proposeAdmin(address));

export const acceptAdmin = (signer: ethers.Signer) => send(signer, (c) => c.acceptAdmin());
