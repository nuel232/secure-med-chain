import { ethers } from 'ethers';
import DrugInventoryABI from '@/abi/DrugInventoryABI.json';

const CONTRACT_ADDRESS = '0x606C3b4e45EA9a4f11f58676A6D57609faE9035f';

/**
 * Get contract instance
 */
function getContract(providerOrSigner) {
  return new ethers.Contract(CONTRACT_ADDRESS, DrugInventoryABI, providerOrSigner);
}

/**
 * Get all drugs from the blockchain
 */
export async function getAllDrugs(provider) {
  try {
    const contract = getContract(provider);
    console.log('🔍 Getting all drug IDs from contract:', CONTRACT_ADDRESS);
    
    // Get all drug IDs first
    const drugIds = await contract.getAllDrugIds();
    console.log('✅ Found drug IDs:', drugIds);
    
    if (!drugIds || drugIds.length === 0) {
      console.log('⚠️ No drugs found');
      return [[], [], [], [], [], []]; // Empty response structure
    }
    
    // Get details for each drug
    const ids: number[] = [];
    const names: string[] = [];
    const quantities: number[] = [];
    const expiryDates: number[] = [];
    const addedBys: string[] = [];
    const timestamps: number[] = [];
    
    console.log('📦 Fetching details for', drugIds.length, 'drugs...');
    
    for (const drugId of drugIds) {
      try {
        const drug = await contract.getDrug(drugId);
        ids.push(Number(drug.id));
        names.push(drug.name);
        quantities.push(Number(drug.quantity));
        expiryDates.push(Number(drug.expiryDate));
        addedBys.push(drug.addedBy);
        timestamps.push(Date.now());
      } catch (err) {
        console.error(`Error fetching drug ${drugId}:`, err);
      }
    }
    
    console.log('✅ Fetched all drug details');
    return [ids, names, quantities, expiryDates, addedBys, timestamps];
  } catch (error) {
    console.error('❌ Error in getAllDrugs:', error);
    // Return empty array instead of throwing so app doesn't break
    console.warn('⚠️ Returning empty drugs array. Contract may not be deployed at this address.');
    return [[], [], [], [], [], []]; // Empty response structure matching contract returns
  }
}

/**
 * Check if an address is an admin
 */
export async function isAdmin(provider, address) {
  try {
    const contract = getContract(provider);
    console.log('🔍 Checking if admin:', address);
    
    const result = await contract.isAdmin(address);
    console.log('✅ isAdmin result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error in isAdmin:', error);
    return false;
  }
}

/**
 * Check if an address is pharmacy staff
 */
export async function isPharmacyStaff(provider, address) {
  try {
    const contract = getContract(provider);
    console.log('🔍 Checking if pharmacy staff:', address);
    
    const result = await contract.isPharmacyStaff(address);
    console.log('✅ isPharmacyStaff result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error in isPharmacyStaff:', error);
    console.warn('⚠️ Could not verify pharmacy staff status. Contract may not be deployed.');
    return false;
  }
}

/**
 * Add a new drug (admin only)
 */
export async function addDrug(signer, name, quantity, expiryTimestamp) {
  try {
    const contract = getContract(signer);
    console.log('📝 Adding drug:', { name, quantity, expiryTimestamp });
    
    const tx = await contract.addDrug(name, quantity, expiryTimestamp);
    console.log('⏳ Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('❌ Error in addDrug:', error);
    throw error;
  }
}

/**
 * Dispense a drug (pharmacy staff only)
 */
export async function dispenseDrug(signer, drugId, quantity) {
  try {
    const contract = getContract(signer);
    console.log('💊 Dispensing drug:', { drugId, quantity });
    
    const tx = await contract.dispenseDrug(drugId, quantity);
    console.log('⏳ Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('❌ Error in dispenseDrug:', error);
    throw error;
  }
}

/**
 * Get a single drug by ID
 */
export async function getDrug(provider, drugId) {
  try {
    const contract = getContract(provider);
    const drug = await contract.getDrug(drugId);
    console.log('✅ Drug details:', drug);
    return drug;
  } catch (error) {
    console.error('❌ Error in getDrug:', error);
    throw error;
  }
}