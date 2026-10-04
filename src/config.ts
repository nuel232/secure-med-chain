/**
 * Runtime configuration. Set these in `.env` (see `.env.example`), not in source.
 */
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim();

export const CONTRACT_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

/** Block the contract was deployed at; event queries start here instead of genesis. */
export const DEPLOY_BLOCK = Math.max(0, Number(import.meta.env.VITE_DEPLOY_BLOCK ?? 0) || 0);

/** Sepolia and a local Hardhat node. */
export const SUPPORTED_CHAIN_IDS = [11155111n, 31337n];

export const EXPLORER_TX_URL = 'https://sepolia.etherscan.io/tx/';
