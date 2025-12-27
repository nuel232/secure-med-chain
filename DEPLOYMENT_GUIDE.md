# Deployment Guide - DrugInventory Smart Contract

## Problem: Contract Not Found

Your wallet connected successfully, but the app can't find the smart contract at the configured address. This happens when:

1. **Contract hasn't been deployed yet** - Most common case
2. **Wrong network** - Contract on Sepolia, but you're connected to Goerli
3. **Wrong address** - Address doesn't match where contract was deployed
4. **Contract code doesn't match ABI** - Code and ABI are out of sync

## Solution: Deploy the Contract

### Step 1: Get the Solidity Code

The contract code provided in the project is complete and ready to deploy. It's the `DrugInventory.sol` contract.

### Step 2: Deploy via Remix (Easiest for Testnet)

1. Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)
2. Create a new file: `DrugInventory.sol`
3. Paste the complete contract code (included in project docs)
4. Compile:
   - Left sidebar → Click "Solidity Compiler" (icon with `S`)
   - Select compiler version `^0.8.19`
   - Click "Compile DrugInventory.sol"
5. Deploy:
   - Click "Deploy & Run Transactions" (icon with plugs)
   - Select network dropdown (top left): Choose your testnet (Sepolia, Goerli, etc.)
   - Click "Deploy"
6. MetaMask will ask you to confirm → Click "Confirm"
7. Deployment takes ~20-30 seconds
8. **Copy the contract address** from the Remix console

### Step 3: Update Your App

1. In `src/services/drugInventoryService.ts`, update line 3:
   ```typescript
   const CONTRACT_ADDRESS = '0xYOUR_NEW_ADDRESS_HERE'; // Replace with deployed address
   ```

2. Also update in `src/contexts/BlockchainContext.tsx` line 9 (if different):
   ```typescript
   const CONTRACT_ADDRESS = '0xYOUR_NEW_ADDRESS_HERE';
   ```

3. Save files and refresh your browser

### Step 4: Grant Yourself Permissions

The contract requires explicit role assignment. After deployment:

1. Go back to Remix
2. Find "Deployed Contracts" section
3. Expand the DrugInventory contract
4. Use `addAdmin(your_wallet_address)` to make your wallet an admin
   - Your wallet address is the one connected via MetaMask
   - Example: `addAdmin("0x2df73d89645c555816c6a94989c79f94908b5ad6")`

5. Confirm transaction in MetaMask

### Step 5: Test in Your App

1. Refresh your app
2. Click "Connect Wallet" again
3. Your wallet should now show "Admin" role
4. You can now add drugs!

## Network Addresses for Reference

Choose ONE of these testnets:

| Network | Testnet | Chain ID | Faucet |
|---------|---------|----------|--------|
| Ethereum | Sepolia | 11155111 | https://sepoliafaucet.com/ |
| Ethereum | Goerli | 5 | https://goerlifaucet.com/ |

## Getting Test ETH (Gas Fees)

You need testnet ETH to pay for gas:

1. Go to appropriate faucet (see table above)
2. Paste your wallet address
3. Request ETH (takes a few minutes)
4. Check your MetaMask - ETH should appear

## Troubleshooting Deployment

### "Insufficient balance" error
- You don't have enough testnet ETH
- Get ETH from faucet (see above)

### "Contract call timeout"
- Network is congested
- Try again in a few minutes
- Or switch to a different testnet

### "Bad RPC" error
- Your MetaMask network settings are wrong
- Go to MetaMask → Settings → Networks
- Verify RPC URL is correct

### Contract deployed but still "No Role Assigned"
- You forgot to call `addAdmin()`
- OR you called it with wrong address
- Go back to Remix and check deployed contract

## After Deployment: Adding Test Data

Once your contract is deployed and you're an admin:

1. Go to Admin Dashboard in your app
2. Click "Add Drug"
3. Fill in:
   - **Name**: e.g., "Paracetamol 500mg"
   - **Quantity**: e.g., 1000
   - **Expiry Date**: Pick a future date
4. Click "Add Drug"
5. MetaMask confirms transaction
6. Drug appears in list!

## Role Management

### For Admin Users (you)
- Can add drugs via `addDrug()`
- Can grant/revoke staff via `addPharmacyStaff()` and `removePharmacyStaff()`
- All done in smart contract - no backend server needed

### For Pharmacy Staff
- Can dispense drugs via `dispenseDrug()`
- Cannot add drugs
- Cannot modify roles

**To add staff:**
1. In Remix, call: `addPharmacyStaff("0xSTAFF_WALLET_ADDRESS")`
2. They now see "Pharmacy Staff" role in your app
3. They can dispense drugs

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Drug not found" | Drug ID doesn't exist | Use correct drug ID from list |
| "Drug expired" | Trying to dispense expired drug | Choose non-expired drug |
| "Insufficient stock" | Not enough quantity | Request smaller amount |
| "Only admin allowed" | Your wallet isn't admin | Call addAdmin() in Remix |
| "Only pharmacy staff allowed" | Your wallet isn't staff | Call addPharmacyStaff() in Remix |
| No drugs showing | Contract empty | Add drugs via Admin Dashboard |

## Final Checklist

- [ ] Downloaded Solidity contract code
- [ ] Deployed to Remix
- [ ] Got deployment address
- [ ] Updated CONTRACT_ADDRESS in code
- [ ] Made myself admin via `addAdmin()`
- [ ] Refreshed app and see "Admin" role
- [ ] Added test drug
- [ ] Created pharmacy staff user
- [ ] Tested dispensing drug

Once complete, your blockchain drug inventory system is live! 🎉
