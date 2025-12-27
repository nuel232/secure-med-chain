# Quick Reference Card

## 🔴 Your Current Issue
Contract address `0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71` doesn't exist.

## 🟢 Solution in 5 Minutes

### 1. Deploy Contract
- Go to https://remix.ethereum.org/
- Create `DrugInventory.sol`
- Paste Solidity code
- Compile (v0.8.19)
- Deploy to Sepolia
- Copy address shown

### 2. Update App
Edit `src/services/drugInventoryService.ts` line 3:
```
const CONTRACT_ADDRESS = '0x[YOUR_NEW_ADDRESS_FROM_REMIX]';
```

### 3. Grant Yourself Admin
In Remix, call:
```
addAdmin(0x2df73d89645c555816c6a94989c79f94908b5ad6)
```
(Replace with your wallet address)

### 4. Refresh App
- Browser refresh
- Click "Connect Wallet" again
- Should show "Admin" role

### 5. Add Test Drug
- Click "Add Drug" button
- Fill details
- Submit

## 📖 Full Guides
- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- `SMART_CONTRACT_SETUP.md` - Technical setup
- `SMART_CONTRACT_INTEGRATION.md` - API reference

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Still shows "No Role Assigned" | Call addAdmin() in Remix with correct address |
| "No drugs showing" | Add drugs via Admin Dashboard |
| Contract call timeout | Try Goerli testnet instead |
| "Only admin allowed" | Grant yourself admin first |

## 🎯 What's Ready Right Now
- ✅ UI works
- ✅ Wallet connection works
- ✅ Falls back to demo data
- ✅ Just need contract deployed

## 🔗 Testnet Faucets
- Sepolia: https://sepoliafaucet.com/
- Goerli: https://goerlifaucet.com/

## 📝 Key Addresses
- **Your Wallet**: 0x2df73d89645c555816c6a94989c79f94908b5ad6
- **Old Contract**: 0xC90b1698CA23D540d1F448F3122D6bd3BD4FAD71 (doesn't work)
- **New Contract**: *Get from Remix after deployment*
