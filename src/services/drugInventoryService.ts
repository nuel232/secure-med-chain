import { ethers } from "ethers";
import DrugInventoryABI from "@/Abi/DrugInventoryABI.json";

const CONTRACT_ADDRESS = '0x4BCD044F75A910999E448431C6F9C7A83c68B243'; // <-- trailing space removed!

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export async function isContractDeployed(provider: ethers.BrowserProvider): Promise<boolean> {
  const code = await provider.getCode(CONTRACT_ADDRESS);
  return code !== "0x";
}

function isBadDecodeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("could not decode result data");
}


/**
 * Get contract instance
 */
function getContract(providerOrSigner: ethers.BrowserProvider | ethers.Signer) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    DrugInventoryABI,
    providerOrSigner,
  );
}

/**
 * Get all drugs from the blockchain
 */
export async function getAllDrugs(provider) {
  try {
    const deployed = await isContractDeployed(provider);
    if (!deployed) {
      console.warn("⚠️ No contract bytecode found at address:", CONTRACT_ADDRESS);
      return [[], [], [], [], [], []];
    }

    const contract = getContract(provider);
    console.log("🔍 Getting all drug IDs from contract:", CONTRACT_ADDRESS);

    // Get all drug IDs first
    const drugIds = await contract.getAllDrugIds();
    console.log("✅ Found drug IDs:", drugIds);

    if (!drugIds || drugIds.length === 0) {
      console.log("⚠️ No drugs found");
      return [[], [], [], [], [], []]; // Empty response structure
    }

    // Get details for each drug
    const ids: number[] = [];
    const names: string[] = [];
    const quantities: number[] = [];
    const expiryDates: number[] = [];
    const addedBys: string[] = [];
    const timestamps: number[] = [];

    console.log("📦 Fetching details for", drugIds.length, "drugs...");

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

    console.log("✅ Fetched all drug details");
    return [ids, names, quantities, expiryDates, addedBys, timestamps];
  } catch (error) {
    console.error("❌ Error in getAllDrugs:", error);
    if (isBadDecodeError(error)) {
      console.warn("⚠️ ABI/address/network mismatch detected while reading drugs.");
    }
    // Return empty array instead of throwing so app doesn't break
    console.warn(
      "⚠️ Returning empty drugs array. Contract may not be deployed at this address.",
    );
    return [[], [], [], [], [], []]; // Empty response structure matching contract returns
  }
}

/**
 * Check if an address is an admin
 */
export async function isAdmin(provider, address) {
  try {
    const deployed = await isContractDeployed(provider);
    if (!deployed) return false;

    const contract = getContract(provider);
    console.log("🔍 Checking if admin:", address);

    const result = await contract.isAdmin(address);
    console.log("✅ isAdmin result:", result);

    return result;
  } catch (error) {
    console.error("❌ Error in isAdmin:", error);
    if (isBadDecodeError(error)) {
      console.warn("⚠️ ABI/address/network mismatch detected while checking admin role.");
    }
    return false;
  }
}

/**
 * Check if an address is pharmacy staff
 */
export async function isPharmacyStaff(provider, address) {
  try {
    const deployed = await isContractDeployed(provider);
    if (!deployed) return false;

    const contract = getContract(provider);
    console.log("🔍 Checking if pharmacy staff:", address);

    const result = await contract.isPharmacyStaff(address);
    console.log("✅ isPharmacyStaff result:", result);

    return result;
  } catch (error) {
    console.error("❌ Error in isPharmacyStaff:", error);
    if (isBadDecodeError(error)) {
      console.warn("⚠️ ABI/address/network mismatch detected while checking pharmacy role.");
    }
    console.warn(
      "⚠️ Could not verify pharmacy staff status. Contract may not be deployed.",
    );
    return false;
  }
}

export type BatchDrugInput = {
  name: string;
  quantity: number;
  expiryTimestamp: number;
};

/**
 * Add many drugs in one transaction (admin only). Requires `addDrugsBatch` on the deployed contract.
 */
export async function addDrugsBatch(signer: ethers.Signer, items: BatchDrugInput[]) {
  try {
    if (items.length === 0) {
      throw new Error("Batch is empty");
    }
    const provider = signer.provider as ethers.BrowserProvider | null;
    if (!provider) {
      throw new Error("Signer provider is unavailable");
    }
    const deployed = await isContractDeployed(provider);
    if (!deployed) {
      throw new Error(`No contract deployed at ${CONTRACT_ADDRESS} on current network`);
    }

    const contract = getContract(signer);
    const names = items.map((i) => i.name);
    const quantities = items.map((i) => BigInt(i.quantity));
    const expiryTimestamps = items.map((i) => BigInt(i.expiryTimestamp));

    console.log("📝 Adding drugs batch:", { count: items.length });

    const tx = await contract.addDrugsBatch(names, quantities, expiryTimestamps);
    console.log("⏳ Batch transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Batch transaction confirmed:", receipt);

    return receipt;
  } catch (error) {
    console.error("❌ Error in addDrugsBatch:", error);
    throw error;
  }
}

/**
 * Add a new drug (admin only)
 */
export async function addDrug(signer, name, quantity, expiryTimestamp) {
  try {
    const provider = signer.provider as ethers.BrowserProvider | null;
    if (!provider) {
      throw new Error("Signer provider is unavailable");
    }
    const deployed = await isContractDeployed(provider);
    if (!deployed) {
      throw new Error(`No contract deployed at ${CONTRACT_ADDRESS} on current network`);
    }

    const contract = getContract(signer);
    console.log("📝 Adding drug:", { name, quantity, expiryTimestamp });

    const tx = await contract.addDrug(name, quantity, expiryTimestamp);
    console.log("⏳ Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed:", receipt);

    return receipt;
  } catch (error) {
    console.error("❌ Error in addDrug:", error);
    throw error;
  }
}

/**
 * Dispense a drug (pharmacy staff only)
 */
export async function dispenseDrug(signer, drugId, quantity) {
  try {
    const provider = signer.provider as ethers.BrowserProvider | null;
    if (!provider) {
      throw new Error("Signer provider is unavailable");
    }
    const deployed = await isContractDeployed(provider);
    if (!deployed) {
      throw new Error(`No contract deployed at ${CONTRACT_ADDRESS} on current network`);
    }

    const contract = getContract(signer);
    console.log("💊 Dispensing drug:", { drugId, quantity });

    const tx = await contract.dispenseDrug(drugId, quantity);
    console.log("⏳ Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed:", receipt);

    return receipt;
  } catch (error) {
    console.error("❌ Error in dispenseDrug:", error);
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
    console.log("✅ Drug details:", drug);
    return drug;
  } catch (error) {
    console.error("❌ Error in getDrug:", error);
    throw error;
  }
}