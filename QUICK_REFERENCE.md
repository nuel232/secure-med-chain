# Quick Reference - Simplified Contract

## The Simple Rule

```
Connect Wallet → Check if you're the deployer
  ↓
YES (You're the deployer)  →  You're ADMIN
  ↓
  Can: Add drugs ✅
  Cannot: Dispense drugs ❌

  ↓
NO (You're not the deployer)  →  You're PHARMACY STAFF
  ↓
  Can: Dispense drugs ✅
  Cannot: Add drugs ❌
```

---

## Deployment Checklist

- [ ] Go to https://remix.ethereum.org
- [ ] Create `DrugInventory.sol` file with contract code
- [ ] Select Solidity compiler 0.8.19
- [ ] Compile contract (should show green checkmark)
- [ ] Select "Deploy & Run Transactions" tab
- [ ] Choose Sepolia network
- [ ] Click "Deploy"
- [ ] Wait for confirmation
- [ ] Copy contract address
- [ ] Paste in `src/services/drugInventoryService.ts` line 4: `const CONTRACT_ADDRESS = '0x...'`
- [ ] Save file
- [ ] Run app and test!

---

## Testing Workflow

### Admin Test (Deployer Account)
```
1. In MetaMask: Use the account that deployed contract
2. In app: Click "Connect Wallet"
3. Should see: "Admin" ✅
4. Try: Add a drug → Should work ✅
5. Try: Dispense drug → Should fail "Admin cannot..." ❌
```

### Staff Test (Different Account)
```
1. In MetaMask: Switch to different account
2. In app: Click "Disconnect" then "Connect Wallet"
3. Should see: "Pharmacy Staff" ✅
4. Try: Add drug → Should fail "Only admin..." ❌
5. Try: Dispense drug → Should work ✅
```

---

## File Changes Summary

```
Updated:
  ✅ src/contracts/DrugInventory.sol (Simplified roles)
  ✅ src/Abi/DrugInventoryABI.json (New ABI)
  ✅ src/services/drugInventoryService.ts (Removed old functions)

Created:
  ✅ DEPLOYMENT_GUIDE_SIMPLIFIED.md
  ✅ SIMPLIFICATION_SUMMARY.md
  ✅ This file

No changes needed:
  ✅ React components (they already use correct functions)
  ✅ Context/hooks (they already work)
  ✅ UI (no changes needed)
```

---

## What to Update After Deployment

Only ONE file needs updating after you deploy:

**File:** `src/services/drugInventoryService.ts`

**Line 4:**
```typescript
const CONTRACT_ADDRESS = '0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71'; // ← Change this
```

Change to:
```typescript
const CONTRACT_ADDRESS = '0xYOUR_NEW_ADDRESS_HERE'; // ← Your deployed address
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Contract not deployed" | Wrong contract address | Copy address from Remix after deploy |
| "Not Authorized" adding drug | Not using deployer account | Switch to deployer in MetaMask |
| "Admin cannot perform" dispensing | Using deployer account | Switch to non-deployer account |
| No drugs showing | Contract empty or contract call failing | Check CONTRACT_ADDRESS, add sample data first |
| MetaMask won't open | Wallet extension issue | Try refreshing page |

---

## Contract Functions (Quick Reference)

### Admin-Only
```solidity
addDrug(name, quantity, expiryDate)  // Only deployer
```

### Staff-Only
```solidity
dispenseDrug(drugId, quantity)  // Only non-deployer
```

### Public/View
```solidity
isAdmin(address)           // Returns true/false
isPharmacyStaff(address)   // Returns true/false
getDrug(id)                // Returns drug details
getAllDrugIds()            // Returns array of IDs
isExpired(id)              // Returns true/false
deployer                   // Returns deployer address
drugCount                  // Returns total drugs
```

---

## Network Info

**Testnet:** Sepolia
- **Chain ID:** 11155111
- **RPC:** https://eth-sepolia.g.alchemy.com/v2/...
- **Faucet:** https://www.alchemy.com/faucets/sepolia

**Testnet:** Goerli (alternative)
- **Chain ID:** 5
- **RPC:** https://eth-goerli.g.alchemy.com/v2/...
- **Faucet:** https://goerlifaucet.com/

---

## React App Flow

```jsx
App Loads
  ↓
BlockchainContext provides connection
  ↓
User clicks "Connect Wallet"
  ↓
MetaMask opens, user approves
  ↓
App gets wallet address
  ↓
App calls: isAdmin(address) → true/false
  ↓
Based on result:
  - true → Show AdminDashboard
  - false → Show PharmacyDashboard
  ↓
User can now perform role-specific actions
```

---

## Need Help?

1. **Contract won't compile?** → Check Solidity version is 0.8.19
2. **Contract won't deploy?** → Ensure you have testnet ETH for gas
3. **App shows "No Role"?** → Check CONTRACT_ADDRESS is correct
4. **Functions fail in app?** → Check contract was deployed to correct network

See `DEPLOYMENT_GUIDE_SIMPLIFIED.md` for detailed troubleshooting.
