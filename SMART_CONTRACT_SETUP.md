# Smart Contract Integration Setup

## Quick Start

### 1. Deployed Contract Address
```
0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71
```

### 2. Files Created/Updated

**New Service Layer:**
- `src/services/drugInventoryService.ts` - Main contract interaction service

**Context/State Management:**
- `src/contexts/BlockchainContextTypes.ts` - Type definitions (NEW)
- `src/contexts/BlockchainContext.tsx` - Updated with smart contract integration
- `src/hooks/useBlockchain.ts` - Hook for using blockchain context (NEW)

**ABI:**
- `src/Abi/DrugInventoryABI.json` - Smart contract ABI

**Updated Components:**
- `src/pages/Landing.tsx` - Updated imports
- `src/pages/AdminDashboard.tsx` - Updated imports
- `src/pages/PharmacyDashboard.tsx` - Updated imports
- `src/components/shared/Header.tsx` - Updated imports

### 3. How It Works

#### Wallet Connection Flow
```
User clicks "Connect Wallet"
  ↓
MetaMask popup appears
  ↓
User approves connection
  ↓
drugInventoryService fetches all drugs from contract
  ↓
Drugs displayed in UI
```

#### Adding a Drug (Admin)
```
Admin enters drug details
  ↓
drugInventoryService.addDrug() called
  ↓
Smart contract validates (onlyAdmin)
  ↓
Drug added to blockchain
  ↓
Event emitted (DrugAdded)
  ↓
UI updated with new drug
```

#### Dispensing a Drug (Pharmacy Staff)
```
Staff selects drug and quantity
  ↓
drugInventoryService.dispenseDrug() called
  ↓
Smart contract checks:
  - Is caller pharmacy staff?
  - Is drug expired?
  - Is quantity sufficient?
  ↓
Quantity reduced on blockchain
  ↓
Event emitted (DrugDispensed)
  ↓
UI updated with new quantity
```

### 4. Key Service Functions

```typescript
// Admin operations (require admin role)
addDrug(signer, name, quantity, expiryDate)
addPharmacyStaff(signer, address)
removePharmacyStaff(signer, address)

// Pharmacy staff operations
dispenseDrug(signer, drugId, amount)

// Read operations (no gas cost)
getDrug(provider, drugId)
getAllDrugs(provider)
getTotalDrugs(provider)
isAdmin(provider, address)
isPharmacyStaff(provider, address)

// Utility functions
formatExpiryDate(timestamp)
isExpired(expiryDate)
dateToUnixTimestamp(date)
```

### 5. Testing Without a Real Contract

The app has a **fallback mechanism**:
- If contract is unreachable, sample data is displayed
- UI testing can proceed without deployed contract
- Switch to real contract by connecting MetaMask

### 6. Using in Your Components

```typescript
import { useBlockchain } from '@/hooks/useBlockchain';
import * as drugService from '@/services/drugInventoryService';

function MyComponent() {
  const { drugs, addDrug, account } = useBlockchain();
  
  const handleAddDrug = async (name: string, qty: number, date: Date) => {
    if (account) {
      const success = await addDrug(name, qty, date);
      if (success) {
        console.log('Drug added!');
      }
    }
  };
  
  return (
    // Your JSX here
  );
}
```

### 7. Contract Functions Reference

**View Functions (Free to call):**
- `getDrug(uint256 drugId)` → Drug details
- `getAllDrugs()` → All drugs
- `totalDrugs()` → Total count
- `isAdmin(address)` → Boolean
- `isPharmacyStaff(address)` → Boolean

**State-Changing Functions (Require gas):**
- `addDrug(string, uint256, uint256)` → Only admin
- `dispenseDrug(uint256, uint256)` → Only pharmacy staff
- `addAdmin(address)` → Only admin
- `removeAdmin(address)` → Only admin
- `addPharmacyStaff(address)` → Only admin
- `removePharmacyStaff(address)` → Only admin

### 8. Events (Immutable Audit Trail)

All operations emit events that are logged on-chain:
- `DrugAdded(id, name, quantity, expiryDate, addedBy)` - When drug is added
- `DrugDispensed(id, amount, dispensedBy, remainingQuantity)` - When drug is used
- `AdminAdded/Removed(account)`
- `PharmacyStaffAdded/Removed(account)`

### 9. Error Messages

Common error messages you'll see:
- "Only admin allowed" → Not an admin
- "Only pharmacy staff allowed" → Not pharmacy staff
- "Drug expired" → Cannot dispense expired drug
- "Insufficient stock" → Not enough quantity available
- "Drug not found" → Invalid drug ID
- "Failed to connect wallet" → MetaMask issues

### 10. Troubleshooting

**"Contract not found" error:**
- Ensure you're on the correct blockchain network
- Contract address must match deployment network

**"Only admin allowed" when trying to add drug:**
- Contract must have granted you admin role
- Your account might not be recognized as admin

**Drugs not showing up:**
- Check if MetaMask is connected
- Ensure you're on the same network as contract
- Try refreshing the page

**Gas estimation failed:**
- Ensure you have testnet ETH
- Check if account has sufficient balance

## Next Steps

1. Deploy the smart contract to your chosen testnet (Sepolia, Goerli, etc.)
2. Update the `CONTRACT_ADDRESS` in `src/services/drugInventoryService.ts`
3. Update the ABI in `src/Abi/DrugInventoryABI.json` if contract code changes
4. Run the app: `npm run dev`
5. Test with MetaMask connected to the same network
