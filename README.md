# Secure MedChain - Blockchain-Based Drug Inventory Management System

## Overview

Secure MedChain is a healthcare application that uses blockchain technology to manage pharmaceutical drug inventory. The system provides two distinct user roles with automatic role-based access control based on wallet addresses.

### Key Features
- **Blockchain-Secured Inventory**: All drug records stored on the Sepolia testnet blockchain
- **Automatic Role Detection**: Users are automatically classified as Admin (contract deployer) or Pharmacy Staff (all other addresses)
- **Drug Management**: Add, track, and dispense medications with expiry date tracking
- **Transaction History**: Immutable record of all inventory transactions
- **Real-time Synchronization**: Live updates of inventory status across the system

---

## Quick Start Guide

### Prerequisites
- **Wallet**: MetaMask browser extension installed and configured
- **Network**: Connected to Sepolia testnet
- **Testnet ETH**: Small amount of Sepolia ETH for transaction fees
- **Node.js**: v18+ (for development)
- **Bun**: v1.0+ (package manager)

### Environment Setup

1. **Clone or Open the Project**
   ```pwsh
   cd d:\vscode\secure-med-chain
   ```

2. **Install Dependencies**
   ```pwsh
   bun install
   ```

3. **Configure Network**
   - Open MetaMask
   - Switch to Sepolia testnet
   - Ensure you have testnet ETH for gas fees

4. **Deploy Smart Contract** (if needed)
   - Go to [Remix IDE](https://remix.ethereum.org)
   - Paste contract code from `src/contracts/DrugInventory.sol`
   - Compile with Solidity 0.8.19
   - Deploy to Sepolia testnet
   - Copy the contract address

5. **Update Contract Address**
   - Open `src/services/drugInventoryService.ts`
   - Replace `CONTRACT_ADDRESS` with your deployed contract address
   - Open `src/contexts/BlockchainContext.tsx`
   - Update `CONTRACT_ADDRESS` with the same address

6. **Start Development Server**
   ```pwsh
   bun run dev
   ```

7. **Access the Application**
   - Open http://localhost:5173 in your browser
   - Click "Connect Wallet" to authenticate with MetaMask

---

## User Roles & Access

### Admin (Contract Deployer)
- **Automatic Identification**: The address that deployed the contract is automatically the Admin
- **Permissions**:
  - View all drugs in inventory
  - Add new drugs to inventory
  - Dispense/remove drugs from stock
  - Access both Admin Dashboard and Pharmacy Dashboard
- **Dashboard**: Admin Dashboard + Pharmacy Dashboard

### Pharmacy Staff (All Other Addresses)
- **Automatic Identification**: Any wallet address that is not the deployer
- **Permissions**:
  - View all drugs in inventory
  - Dispense/remove drugs from stock
  - Cannot add new drugs to inventory
- **Dashboard**: Pharmacy Dashboard only

### Access Control Logic
- Role determination happens automatically on wallet connection
- Based on comparison: `userAddress === deployerAddress`
- No manual role assignment needed

---

## Application Architecture

### Project Structure
```
secure-med-chain/
├── src/
│   ├── contracts/
│   │   └── DrugInventory.sol          # Smart contract for blockchain
│   ├── services/
│   │   └── drugInventoryService.ts    # Contract interaction layer
│   ├── contexts/
│   │   └── BlockchainContext.tsx      # Global state management
│   ├── pages/
│   │   ├── Landing.tsx                # Home page with wallet connection
│   │   ├── AdminDashboard.tsx         # Admin-only interface
│   │   ├── PharmacyDashboard.tsx      # Pharmacy staff interface
│   │   └── NotFound.tsx               # 404 page
│   ├── components/
│   │   ├── shared/                    # Shared UI components
│   │   ├── ui/                        # shadcn/ui components
│   │   └── layout/                    # Layout components
│   ├── hooks/
│   │   └── useBlockchain.ts           # Custom React hook for blockchain
│   ├── lib/
│   │   └── utils.ts                   # Utility functions
│   ├── App.tsx                        # Main app component
│   └── main.tsx                       # Entry point
├── src/Abi/
│   └── DrugInventoryABI.json          # Smart contract interface
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Dependencies
```

### Technology Stack
- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI)
- **Animation**: Framer Motion
- **Web3**: ethers.js v6.16.0
- **Blockchain**: Solidity 0.8.19
- **Package Manager**: Bun
- **Development**: ESLint, PostCSS

---

## Smart Contract Reference

### Contract: DrugInventory.sol

#### Key Functions

**Admin Only Functions:**

```solidity
// Add a new drug to inventory
function addDrug(
    string calldata name,
    uint256 quantity,
    uint256 expiryTimestamp
) external onlyAdmin
```

**Admin & Pharmacy Staff Functions:**

```solidity
// Dispense/remove drugs from inventory
function dispenseDrug(
    uint256 drugId,
    uint256 quantity
) external onlyPharmacyOrAdmin
```

**View Functions (Public Access):**

```solidity
// Get all drug IDs in inventory
function getAllDrugIds() external view returns (uint256[])

// Get drug details by ID
function getDrug(uint256 drugId) external view returns (
    string name,
    uint256 quantity,
    uint256 expiryDate,
    address addedBy,
    uint256 timestamp
)

// Get total number of drugs
function getTotalDrugs() external view returns (uint256)

// Check if address is admin
function isAdmin(address addr) external view returns (bool)

// Check if address is pharmacy staff
function isPharmacyStaff(address addr) external view returns (bool)

// Check if drug has expired
function isExpired(uint256 drugId) external view returns (bool)
```

#### Access Control Modifiers

- **onlyAdmin**: Allows only the contract deployer
- **onlyPharmacyOrAdmin**: Allows both admins and pharmacy staff
- **drugExists**: Ensures drug ID exists before operations

---

## Workflow & User Journey

### For Admin Users

1. **Connect Wallet**
   - Go to Landing page
   - Click "Connect Wallet"
   - Approve MetaMask connection
   - System automatically detects Admin role

2. **Add Drugs** (Admin Dashboard)
   - Navigate to Admin Dashboard
   - Fill in drug name, quantity, and expiry date
   - Click "Add Drug"
   - Approve transaction in MetaMask
   - Drug appears in inventory after confirmation

3. **Dispense Drugs** (Pharmacy Dashboard)
   - Navigate to Pharmacy Dashboard
   - Select drug and quantity to dispense
   - Click "Dispense"
   - Approve transaction in MetaMask
   - Inventory updates after confirmation

### For Pharmacy Staff

1. **Connect Wallet**
   - Go to Landing page
   - Click "Connect Wallet"
   - Approve MetaMask connection
   - System automatically detects Pharmacy Staff role

2. **View Inventory**
   - Access Pharmacy Dashboard (automatically redirected)
   - See all available drugs and quantities

3. **Dispense Drugs**
   - Select drug and quantity needed
   - Click "Dispense"
   - Approve transaction in MetaMask
   - Quantity deducted from inventory

---

## Data Flow

```
MetaMask Wallet
    ↓
BlockchainContext (Global State)
    ↓
drugInventoryService (Contract Interaction)
    ↓
ethers.js (Web3 Library)
    ↓
Smart Contract on Sepolia Testnet
    ↓
Blockchain Data Storage
```

### State Management

The `BlockchainContext` manages:
- User wallet address and role
- Connected contract instance
- Current drug inventory
- Loading and error states
- Transaction status

Access via custom hook:
```typescript
const { role, drugs, addDrug, dispenseDrug } = useBlockchain();
```

---

## Development Workflow

### Running the Application

**Development Mode:**
```pwsh
bun run dev
```

**Build for Production:**
```pwsh
bun run build
```

**Preview Production Build:**
```pwsh
bun run preview
```

**Linting:**
```pwsh
bun run lint
```

### Key Files to Modify

- **Add Features**: Create new components in `src/components/`
- **Smart Contract**: Edit `src/contracts/DrugInventory.sol` then redeploy
- **Contract Interaction**: Update `src/services/drugInventoryService.ts`
- **State Management**: Modify `src/contexts/BlockchainContext.tsx`
- **UI Pages**: Edit files in `src/pages/`

---

## Testing

### Manual Testing Checklist

**Wallet Connection:**
- [ ] MetaMask connection works
- [ ] Wallet address displays correctly
- [ ] Role is correctly identified (Admin or Pharmacy Staff)
- [ ] Switching wallets updates role appropriately

**Admin Functionality:**
- [ ] Can access Admin Dashboard
- [ ] Can add drugs with valid data
- [ ] Can dispense drugs from inventory
- [ ] Cannot add drugs with invalid data (error handling)

**Pharmacy Functionality:**
- [ ] Pharmacy staff only sees Pharmacy Dashboard
- [ ] Can dispense drugs
- [ ] Cannot access Admin Dashboard (redirected to home)

**Inventory Management:**
- [ ] Drug quantities update correctly after dispensing
- [ ] Expired drugs are marked as expired
- [ ] Drug list refreshes in real-time

**Transaction Handling:**
- [ ] MetaMask prompts appear for transactions
- [ ] Failed transactions show error messages
- [ ] Successful transactions update inventory

### Network Testing
- Test on Sepolia testnet only
- Verify gas fees are deducted correctly
- Confirm transaction confirmations appear

---

## Troubleshooting

### Wallet Connection Issues

**Problem**: "Could not detect window.ethereum"
- **Solution**: Install MetaMask extension and refresh browser

**Problem**: "Not connected to Sepolia testnet"
- **Solution**: 
  - Open MetaMask
  - Click network selector
  - Switch to "Sepolia test network"
  - Refresh application

### Contract Interaction Issues

**Problem**: "contract.getAllDrugs is not a function"
- **Solution**: 
  - Verify CONTRACT_ADDRESS is correct in `drugInventoryService.ts`
  - Check that DrugInventoryABI.json contains the function
  - Ensure contract is deployed to Sepolia

**Problem**: "Insufficient funds for transaction"
- **Solution**: Get testnet ETH from Sepolia faucet (search "Sepolia faucet")

**Problem**: "Error: Transaction reverted"
- **Solution**: 
  - Check role permissions (Admin vs Pharmacy Staff)
  - Verify drug exists before dispensing
  - Ensure sufficient quantity available

### Application Issues

**Problem**: "Page redirects immediately after wallet connection"
- **Solution**: Clear browser cache and cookies, reconnect wallet

**Problem**: "Inventory doesn't update after transaction"
- **Solution**: Wait for blockchain confirmation (usually 10-30 seconds), refresh page

**Problem**: "Build fails with TypeScript errors"
- **Solution**: 
  - Delete `node_modules/` and `.bun/` directories
  - Run `bun install` again
  - Check that all types match in `BlockchainContext.tsx`

---

## Important Notes & Caveats

### Current Limitations
- **Sepolia Testnet Only**: Application currently deployed to test network only
- **No Persistency**: Drug data only exists on blockchain (no database backup)
- **Gas Fees Required**: Every transaction requires testnet ETH
- **Confirmation Times**: Blockchain transactions take 10-30 seconds to confirm

### Security Considerations
- **Private Keys**: Never share your wallet's private key
- **MetaMask**: Only approve transactions you initiated
- **Network Verification**: Always verify you're on Sepolia testnet before transactions
- **Admin Responsibility**: The deployer address is permanent admin - cannot be changed

### Role-Based Restrictions
- **Admin Cannot Transfer Role**: Deployment address is automatically admin forever
- **Pharmacy Staff Cannot Become Admin**: Role change requires redeployment
- **Contract Owner Immutable**: Deployer is hardcoded in contract

---

## Deployment Checklist

When deploying to production:

- [ ] Deploy contract to mainnet (not Sepolia)
- [ ] Update CONTRACT_ADDRESS in both service and context files
- [ ] Configure mainnet RPC endpoint
- [ ] Test thoroughly with mainnet ETH
- [ ] Ensure adequate gas fee budget
- [ ] Set up proper error monitoring
- [ ] Document contract deployment details
- [ ] Backup deployment transaction hash

---

## Resources

- **MetaMask**: https://metamask.io
- **Sepolia Faucet**: https://sepolia-faucet.pk910.de
- **Remix IDE**: https://remix.ethereum.org
- **ethers.js Docs**: https://docs.ethers.org
- **Solidity Docs**: https://docs.soliditylang.org
- **Tailwind CSS**: https://tailwindcss.com

---

## License

This project uses the MIT License. See individual component licenses for details.

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify you're on Sepolia testnet
3. Confirm wallet has sufficient testnet ETH
4. Review error messages in browser console
5. Check transaction status on Sepolia Etherscan: https://sepolia.etherscan.io

---

**Last Updated**: This consolidated documentation replaces all previous markdown files (DEPLOYMENT_GUIDE.md, QUICK_START.md, PROJECT_STATUS.md, etc.) with a single comprehensive reference.
