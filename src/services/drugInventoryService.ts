import { ethers } from 'ethers';
import DrugInventoryABI from '@/Abi/DrugInventoryABI.json';

// Contract address on the blockchain
const CONTRACT_ADDRESS = '0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71';

// ============================================================================
// Drug Inventory Service
// ============================================================================
// This service provides an interface to interact with the DrugInventory
// smart contract. It handles reading/writing drug data to the blockchain.
// ============================================================================

/**
 * Get the contract instance with signer (for write operations)
 * @param provider - Ethers provider or signer
 * @returns Contract instance with signer
 */
export const getContractWithSigner = (signer: ethers.Signer) => {
  return new ethers.Contract(CONTRACT_ADDRESS, DrugInventoryABI, signer);
};

/**
 * Get the contract instance as read-only (for view operations)
 * @param provider - Ethers provider
 * @returns Contract instance (read-only)
 */
export const getContractWithProvider = (provider: ethers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, DrugInventoryABI, provider);
};

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Add a new drug batch to the inventory
 * @param signer - Ethers signer (must be admin)
 * @param name - Drug name
 * @param quantity - Initial quantity
 * @param expiryDate - Unix timestamp of expiry date
 * @returns Transaction receipt
 */
export const addDrug = async (
  signer: ethers.Signer,
  name: string,
  quantity: number,
  expiryDate: number
) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.addDrug(name, quantity, expiryDate);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error adding drug:', error);
    throw error;
  }
};

/**
 * Grant admin role to an address
 * @param signer - Ethers signer (must be admin)
 * @param account - Address to grant admin role to
 * @returns Transaction receipt
 */
export const addAdmin = async (signer: ethers.Signer, account: string) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.addAdmin(account);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error adding admin:', error);
    throw error;
  }
};

/**
 * Revoke admin role from an address
 * @param signer - Ethers signer (must be admin)
 * @param account - Address to revoke admin role from
 * @returns Transaction receipt
 */
export const removeAdmin = async (signer: ethers.Signer, account: string) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.removeAdmin(account);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error removing admin:', error);
    throw error;
  }
};

/**
 * Grant pharmacy staff role to an address
 * @param signer - Ethers signer (must be admin)
 * @param account - Address to grant pharmacy staff role to
 * @returns Transaction receipt
 */
export const addPharmacyStaff = async (
  signer: ethers.Signer,
  account: string
) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.addPharmacyStaff(account);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error adding pharmacy staff:', error);
    throw error;
  }
};

/**
 * Revoke pharmacy staff role from an address
 * @param signer - Ethers signer (must be admin)
 * @param account - Address to revoke pharmacy staff role from
 * @returns Transaction receipt
 */
export const removePharmacyStaff = async (
  signer: ethers.Signer,
  account: string
) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.removePharmacyStaff(account);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error removing pharmacy staff:', error);
    throw error;
  }
};

// ============================================================================
// PHARMACY STAFF FUNCTIONS
// ============================================================================

/**
 * Dispense (use) a quantity of a drug batch
 * @param signer - Ethers signer (must be pharmacy staff)
 * @param drugId - ID of the drug to dispense
 * @param amount - Quantity to dispense
 * @returns Transaction receipt
 */
export const dispenseDrug = async (
  signer: ethers.Signer,
  drugId: number,
  amount: number
) => {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.dispenseDrug(drugId, amount);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error dispensing drug:', error);
    throw error;
  }
};

// ============================================================================
// VIEW FUNCTIONS (Read-only)
// ============================================================================

/**
 * Get details of a specific drug
 * @param provider - Ethers provider
 * @param drugId - ID of the drug
 * @returns Drug object with id, name, quantity, expiryDate, addedBy, active
 */
export const getDrug = async (provider: ethers.Provider, drugId: number) => {
  try {
    const contract = getContractWithProvider(provider);
    const drug = await contract.getDrug(drugId);
    return {
      id: drug[0].toString(),
      name: drug[1],
      quantity: drug[2].toString(),
      expiryDate: drug[3].toString(),
      addedBy: drug[4],
      active: drug[5],
    };
  } catch (error) {
    console.error('Error fetching drug:', error);
    throw error;
  }
};

/**
 * Get all drugs in the inventory
 * @param provider - Ethers provider
 * @returns Array of all drugs with their details
 */
export const getAllDrugs = async (provider: ethers.Provider) => {
  try {
    const contract = getContractWithProvider(provider);
    const allDrugs = await contract.getAllDrugs();

    const drugs = allDrugs[0].map((id: ethers.BigNumberish, index: number) => ({
      id: id.toString(),
      name: allDrugs[1][index],
      quantity: allDrugs[2][index].toString(),
      expiryDate: allDrugs[3][index].toString(),
      addedBy: allDrugs[4][index],
      active: allDrugs[5][index],
    }));

    return drugs;
  } catch (error) {
    console.error('Error fetching all drugs:', error);
    throw error;
  }
};

/**
 * Get total number of drug batches
 * @param provider - Ethers provider
 * @returns Total drug count
 */
export const getTotalDrugs = async (provider: ethers.Provider) => {
  try {
    const contract = getContractWithProvider(provider);
    const total = await contract.totalDrugs();
    return total.toString();
  } catch (error) {
    console.error('Error fetching total drugs:', error);
    throw error;
  }
};

/**
 * Check if an address is an admin
 * @param provider - Ethers provider
 * @param address - Address to check
 * @returns Boolean indicating if address is admin
 */
export const isAdmin = async (
  provider: ethers.Provider,
  address: string
): Promise<boolean> => {
  try {
    const contract = getContractWithProvider(provider);
    return await contract.isAdmin(address);
  } catch (error) {
    console.error('Error checking admin status:', error);
    throw error;
  }
};

/**
 * Check if an address is pharmacy staff
 * @param provider - Ethers provider
 * @param address - Address to check
 * @returns Boolean indicating if address is pharmacy staff
 */
export const isPharmacyStaff = async (
  provider: ethers.Provider,
  address: string
): Promise<boolean> => {
  try {
    const contract = getContractWithProvider(provider);
    return await contract.isPharmacyStaff(address);
  } catch (error) {
    console.error('Error checking pharmacy staff status:', error);
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert Unix timestamp to readable date string
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatExpiryDate = (unixTimestamp: string | number): string => {
  const timestamp = typeof unixTimestamp === 'string' ? parseInt(unixTimestamp) : unixTimestamp;
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Check if a drug is expired
 * @param expiryDate - Unix timestamp of expiry
 * @returns Boolean indicating if expired
 */
export const isExpired = (expiryDate: string | number): boolean => {
  const timestamp = typeof expiryDate === 'string' ? parseInt(expiryDate) : expiryDate;
  return timestamp < Math.floor(Date.now() / 1000);
};

/**
 * Convert a date object to Unix timestamp
 * @param date - JavaScript Date object
 * @returns Unix timestamp in seconds
 */
export const dateToUnixTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};
