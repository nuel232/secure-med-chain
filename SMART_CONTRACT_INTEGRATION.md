# Smart Contract Integration Guide

## Overview

This document describes how the **DrugInventory** smart contract is integrated with the Secure Med Chain application.

## Contract Details

- **Contract Address**: `0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71`
- **Network**: Ethereum Testnet (e.g., Sepolia, Goerli)
- **ABI Location**: `src/Abi/DrugInventoryABI.json`

## Architecture

### Service Layer (`src/services/drugInventoryService.ts`)

The `drugInventoryService` provides a clean interface to interact with the smart contract. It handles:

- **Admin Functions**:
  - `addDrug()` - Add new drug batches
  - `addAdmin()` - Grant admin role
  - `removeAdmin()` - Revoke admin role
  - `addPharmacyStaff()` - Grant pharmacy staff role
  - `removePharmacyStaff()` - Revoke pharmacy staff role

- **Pharmacy Staff Functions**:
  - `dispenseDrug()` - Dispense/use drugs from inventory

- **View Functions** (read-only):
  - `getDrug()` - Get details of a single drug
  - `getAllDrugs()` - Get all drugs in inventory
  - `getTotalDrugs()` - Get total number of drug batches
  - `isAdmin()` - Check if address is admin
  - `isPharmacyStaff()` - Check if address is pharmacy staff

- **Utility Functions**:
  - `formatExpiryDate()` - Convert Unix timestamp to readable date
  - `isExpired()` - Check if a drug batch is expired
  - `dateToUnixTimestamp()` - Convert JavaScript Date to Unix timestamp

### Context Layer (`src/contexts/`)

#### `BlockchainContextTypes.ts`
Defines TypeScript interfaces and the BlockchainContext:
- `Drug` - Drug data structure
- `TransactionLog` - Transaction record structure
- `BlockchainContextType` - Context interface
- `BlockchainContext` - React Context

#### `BlockchainContext.tsx`
Provides the provider component and state management:
- Wallet connection via MetaMask
- Drug state synchronization from smart contract
- Mock data fallback for demo mode
- User role management (admin / pharmacy staff)

### Hook (`src/hooks/useBlockchain.ts`)

Custom React hook to access blockchain context:
```typescript
const { 
  isConnected, 
  account, 
  role, 
  drugs, 
  addDrug, 
  dispenseDrug 
} = useBlockchain();
```

## Usage Examples

### 1. Connecting a Wallet

```typescript
import { useBlockchain } from '@/hooks/useBlockchain';

function MyComponent() {
  const { connectWallet, account, isConnected } = useBlockchain();
  
  return (
    <button onClick={connectWallet}>
      {isConnected ? `Connected: ${account}` : 'Connect Wallet'}
    </button>
  );
}
```

### 2. Adding a Drug (Admin Only)

```typescript
import * as drugService from '@/services/drugInventoryService';
import { ethers } from 'ethers';

async function addNewDrug() {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  
  const expiryDate = new Date('2025-12-31');
  const unixTimestamp = Math.floor(expiryDate.getTime() / 1000);
  
  const receipt = await drugService.addDrug(
    signer,
    'Paracetamol 500mg',
    1000, // quantity
    unixTimestamp
  );
  
  console.log('Drug added:', receipt.transactionHash);
}
```

### 3. Dispensing a Drug (Pharmacy Staff Only)

```typescript
async function useDrug() {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  
  const receipt = await drugService.dispenseDrug(
    signer,
    1, // drugId
    50  // quantity to dispense
  );
  
  console.log('Drug dispensed:', receipt.transactionHash);
}
```

### 4. Fetching All Drugs

```typescript
async function loadDrugs() {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);
  
  const drugs = await drugService.getAllDrugs(provider);
  
  drugs.forEach(drug => {
    console.log(`${drug.name}: ${drug.quantity} units`);
    console.log(`Expires: ${drugService.formatExpiryDate(drug.expiryDate)}`);
  });
}
```

### 5. Granting Roles

```typescript
async function makeUserStaff() {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  
  // Only admin can grant roles
  const receipt = await drugService.addPharmacyStaff(
    signer,
    '0x...' // target address
  );
}
```

## Integration Points

### `Landing.tsx`
- Renders wave background
- Handles wallet connection
- Offers role selection (admin / pharmacy staff)

### `AdminDashboard.tsx`
- Displays all drugs in inventory
- Allows adding new drugs
- Shows transaction history
- Role-based access control

### `PharmacyDashboard.tsx`
- Displays available drugs
- Allows dispensing drugs
- Shows expiry status
- Prevents dispensing expired drugs

## Security Considerations

1. **On-Chain Validation**: All role checks are enforced by the smart contract, not just frontend
2. **Expiry Checks**: Smart contract prevents dispensing expired drugs
3. **Quantity Validation**: Smart contract prevents overdispensing
4. **Immutability**: Once a drug is added, its name and expiry date cannot be modified
5. **Event Logging**: All transactions emit events for audit trail

## Environment Setup

### Required Packages
```json
{
  "ethers": "^6.16.0"
}
```

### Wallet Setup
1. Install MetaMask browser extension
2. Connect to the same network where the contract is deployed
3. Have testnet ETH for gas fees

## Testing the Integration

### Manual Testing Checklist
- [ ] Connect MetaMask wallet
- [ ] Select admin role and add a test drug
- [ ] Switch to pharmacy staff account
- [ ] Dispense some of the drug
- [ ] Verify quantity decreases
- [ ] Check transaction history
- [ ] Try dispensing expired drug (should fail)
- [ ] Try dispensing more than available (should fail)

### Mock Data Fallback
If the contract is unavailable, the app uses sample data for demonstration:
- 3 active drugs
- 1 expired drug
- Sample transaction logs

This allows for UI testing without requiring a deployed contract.

## Error Handling

The service includes error handling for common scenarios:
- "Only admin allowed" - User doesn't have admin role
- "Drug expired" - Attempting to dispense expired drug
- "Insufficient stock" - Attempting to dispense more than available
- "Drug not found" - Invalid drug ID
- "Failed to connect wallet" - MetaMask or wallet connection issues

## Contract Audit Trail

All operations emit events that serve as an immutable audit trail:

```solidity
event DrugAdded(uint256 indexed id, string name, uint256 quantity, uint256 expiryDate, address indexed addedBy);
event DrugDispensed(uint256 indexed id, uint256 amount, address indexed dispensedBy, uint256 remainingQuantity);
```

These events can be queried from blockchain explorers to verify all historical operations.

## Future Enhancements

- [ ] Multi-signature approval for critical operations
- [ ] Batch operations support
- [ ] Role-based access control refinements
- [ ] Price tracking for drugs
- [ ] Inventory alerts (low stock)
- [ ] Integration with IoT sensors for temperature monitoring
