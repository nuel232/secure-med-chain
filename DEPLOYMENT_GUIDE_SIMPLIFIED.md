# DrugInventory Smart Contract - Simplified Deployment Guide

## Overview

The updated smart contract uses a **simplified role system**:
- **Admin**: The account that deploys the contract (automatically)
- **Pharmacy Staff**: All other accounts (automatically)

No manual role assignment needed! Just connect your wallet and the app automatically determines your role.

---

## Step 1: Deploy Contract on Remix

1. Go to [Remix IDE](https://remix.ethereum.org)

2. Create a new file: `DrugInventory.sol` and copy this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DrugInventory
 * @notice Blockchain-based drug inventory management for hospitals
 * @dev Simplified Role System: Only deployer is admin, all others are pharmacy staff
 */
contract DrugInventory {
    // ============ State Variables ============

    address public deployer;
    
    // Drug structure
    struct Drug {
        uint256 id;
        string name;
        uint256 quantity;
        uint256 expiryDate;     // Unix timestamp
        address addedBy;
        uint256 addedAt;        // Unix timestamp
        bool exists;
    }
    
    // Storage
    mapping(uint256 => Drug) public drugs;
    uint256 public drugCount;
    uint256[] public drugIds;
    
    // ============ Events ============
    
    event DrugAdded(
        uint256 indexed id,
        string name,
        uint256 quantity,
        uint256 expiryDate,
        address indexed addedBy,
        uint256 timestamp
    );
    
    event DrugDispensed(
        uint256 indexed drugId,
        string drugName,
        uint256 quantity,
        address indexed dispensedBy,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        require(msg.sender == deployer, "Only admin (deployer) can perform this action");
        _;
    }
    
    modifier onlyPharmacyStaff() {
        require(msg.sender != deployer, "Admin cannot perform this action");
        _;
    }
    
    modifier drugExists(uint256 _drugId) {
        require(drugs[_drugId].exists, "Drug does not exist");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        deployer = msg.sender;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a new drug batch to inventory (Admin only)
     * @param _name Name of the drug
     * @param _quantity Initial quantity
     * @param _expiryDate Expiry date as Unix timestamp
     */
    function addDrug(
        string memory _name,
        uint256 _quantity,
        uint256 _expiryDate
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "Drug name cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");
        
        drugCount++;
        uint256 newDrugId = drugCount;
        
        drugs[newDrugId] = Drug({
            id: newDrugId,
            name: _name,
            quantity: _quantity,
            expiryDate: _expiryDate,
            addedBy: msg.sender,
            addedAt: block.timestamp,
            exists: true
        });
        
        drugIds.push(newDrugId);
        
        emit DrugAdded(
            newDrugId,
            _name,
            _quantity,
            _expiryDate,
            msg.sender,
            block.timestamp
        );
    }
    
    // ============ Pharmacy Functions ============
    
    /**
     * @notice Dispense drugs from inventory (Pharmacy staff only)
     * @param _drugId ID of the drug to dispense
     * @param _quantity Quantity to dispense
     */
    function dispenseDrug(
        uint256 _drugId,
        uint256 _quantity
    ) external onlyPharmacyStaff drugExists(_drugId) {
        Drug storage drug = drugs[_drugId];
        
        require(drug.expiryDate > block.timestamp, "Cannot dispense expired drugs");
        require(drug.quantity >= _quantity, "Insufficient quantity");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        drug.quantity -= _quantity;
        
        emit DrugDispensed(
            _drugId,
            drug.name,
            _quantity,
            msg.sender,
            block.timestamp
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get drug details by ID
     * @param _drugId ID of the drug
     */
    function getDrug(uint256 _drugId) external view drugExists(_drugId) returns (
        uint256 id,
        string memory name,
        uint256 quantity,
        uint256 expiryDate,
        address addedBy,
        uint256 addedAt,
        bool isExpired
    ) {
        Drug storage drug = drugs[_drugId];
        return (
            drug.id,
            drug.name,
            drug.quantity,
            drug.expiryDate,
            drug.addedBy,
            drug.addedAt,
            drug.expiryDate <= block.timestamp
        );
    }
    
    /**
     * @notice Get all drug IDs
     * @return Array of drug IDs
     */
    function getAllDrugIds() external view returns (uint256[] memory) {
        return drugIds;
    }
    
    /**
     * @notice Get total number of drugs
     */
    function getTotalDrugs() external view returns (uint256) {
        return drugCount;
    }
    
    /**
     * @notice Check if a drug is expired
     * @param _drugId ID of the drug
     */
    function isExpired(uint256 _drugId) external view drugExists(_drugId) returns (bool) {
        return drugs[_drugId].expiryDate <= block.timestamp;
    }
    
    /**
     * @notice Check if an address is the admin (deployer)
     * @param _address Address to check
     */
    function isAdmin(address _address) external view returns (bool) {
        return _address == deployer;
    }
    
    /**
     * @notice Check if an address is pharmacy staff
     * @param _address Address to check
     */
    function isPharmacyStaff(address _address) external view returns (bool) {
        return _address != deployer;
    }
}
```

3. Go to **Compile** (left sidebar)
   - Select Compiler Version: `0.8.19`
   - Click **Compile DrugInventory.sol**
   - ✅ Should show green checkmark (no errors)

4. Go to **Deploy & Run Transactions**
   - Environment: Select **Sepolia** (or **Goerli** testnet)
   - Your MetaMask should auto-connect
   - Account: Use your deployer account
   - Click **Deploy**

5. ⏳ Wait for confirmation in MetaMask and Remix
   - Copy the **Contract Address** (you'll need this)

---

## Step 2: Update App Configuration

1. Open `src/services/drugInventoryService.ts`

2. Update the `CONTRACT_ADDRESS`:
```typescript
const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed address
```

3. Save the file

---

## Step 3: Test the App

### Test as Admin (Deployer)
1. Connect with your **deployer wallet** in the app
2. Should see: **"Admin"** role displayed
3. You can:
   - ✅ Add drugs to inventory
   - ❌ Cannot dispense drugs (only pharmacy staff can)

### Test as Pharmacy Staff
1. Switch to a **different wallet address** in MetaMask
2. Connect that wallet in the app
3. Should see: **"Pharmacy Staff"** role displayed
4. You can:
   - ❌ Cannot add drugs (only admin can)
   - ✅ Dispense drugs from inventory

---

## Important Notes

### ✅ Automatic Role Assignment
- **No manual role assignment needed!**
- Just connect your wallet
- App checks: "Is this the deployer address?"
  - If YES → Admin
  - If NO → Pharmacy Staff

### 🔒 Access Control
- **Admin functions** (addDrug): Only deployer can call
- **Pharmacy functions** (dispenseDrug): Only non-deployer addresses can call
- **View functions**: Anyone can read

### 📱 Web3 Flow
1. User clicks "Connect Wallet"
2. MetaMask opens
3. User approves connection
4. App queries: `isAdmin(userAddress)` → true/false
5. Shows appropriate dashboard

### 🧪 Testnet Faucets
Get free Sepolia ETH to pay for gas:
- [Sepoila Faucet](https://www.alchemy.com/faucets/sepolia)
- [Goerli Faucet](https://goerlifaucet.com/)

---

## Troubleshooting

### "Contract not deployed at this address"
- Check `CONTRACT_ADDRESS` in `drugInventoryService.ts`
- Make sure you copied the address correctly from Remix
- Verify the contract was deployed to the same testnet

### "Not Authorized" error when trying to add drug
- You must be using the **deployer account** (the one that deployed the contract)
- Switch to that account in MetaMask

### "Admin cannot perform this action" when dispensing
- You're using the **deployer account**
- Switch to a different account that's NOT the deployer
- Only non-deployer addresses can dispense drugs

### Transactions failing
- Check you have enough **testnet ETH** for gas
- Use the faucet links above to get more testnet ETH

---

## Contract Functions Reference

| Function | Caller | Purpose |
|----------|--------|---------|
| `addDrug(name, qty, date)` | Admin only | Add drugs to inventory |
| `dispenseDrug(id, qty)` | Pharmacy staff only | Dispense drugs from inventory |
| `getDrug(id)` | Anyone | Get drug details |
| `getAllDrugIds()` | Anyone | Get list of all drug IDs |
| `isAdmin(address)` | Anyone | Check if address is admin |
| `isPharmacyStaff(address)` | Anyone | Check if address is pharmacy staff |

---

## Next Steps

1. Deploy contract to testnet ✅
2. Update `CONTRACT_ADDRESS` in the app ✅
3. Test with your deployer wallet
4. Test with a different wallet
5. Deploy to mainnet when ready (update RPC URL in config)
