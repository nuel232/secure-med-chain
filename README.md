# Secure MedChain

Blockchain-backed drug inventory for hospitals and pharmacies. Stock is added by an admin, dispensed
by whitelisted pharmacy staff, and every action is written to the chain as an event, giving a
tamper-evident audit trail.

Final-year project. Runs on the Sepolia testnet (or a local Hardhat node).

## Why a blockchain here?

A normal database with audit logs is enough when one organisation controls the data. The case for a
chain is **multi-party trust**: a hospital group, its suppliers and a regulator who don't all trust one
administrator's ability to quietly edit history. Once an entry is mined, nobody, including the admin,
can rewrite it; corrections appear as new, attributed events.

## Features

- **Role-based access enforced by the contract**, not just the UI (see below)
- Add drug batches with batch number and optional regulator registration number (e.g. NAFDAC)
- **CSV import**, sent as one transaction per 100 rows ([docs/CSV_IMPORT.md](docs/CSV_IMPORT.md)); sample files below
- Dispense with a mandatory reason / destination, blocked automatically for expired or insufficient stock
- Admin stock **adjustment** (with reason) and **write-off** of expired stock; history is never deleted
- Staff management and two-step admin hand-over from the UI
- **Stock position dashboard**: a "Needs attention" table (expired, expiring within 30 days, under 100 units), 14-day dispensed/received chart, most-dispensed ranking and a latest-movements ledger, all derived from on-chain events
- Audit log rebuilt entirely from on-chain events
- Contract test suite (Hardhat) and CI

## Security model

| Actor | Can do |
| --- | --- |
| **Admin** (deployer; transferable) | Add stock, adjust, write off, grant/revoke staff, propose a new admin, dispense |
| **Authorized staff** (whitelisted by admin) | Dispense |
| **Anyone else** | Read only |

- A random wallet **cannot** dispense. `dispenseDrug` reverts unless the caller is admin or whitelisted.
- Admin transfer is **two-step** (`proposeAdmin` then `acceptAdmin`), so a mistyped address can't lock you out.
- Dispensing and adjusting require a reason, so every stock movement is explained on-chain.
- The contract is the source of truth for authorization. The UI hides controls for convenience only.

**Privacy:** a public chain is permanent and world-readable. Never enter patient names or IDs in
reason fields. Use a ward, department or prescription-batch reference.

**Scope: no patient-facing side, on purpose.** The chain records stock and staff accountability, not
people. Anything that identifies a patient would be permanent and public, and would raise data
protection duties (e.g. the Nigeria Data Protection Act). If a patient feature is ever added, the safe
shape is a read-only public page that checks a batch or registration number against the contract. It
should store no personal data. Prescriptions or patient records belong in a separate off-chain system.

**Known limitations** (reasonable for a prototype, worth stating in a defense):
- A single admin key is a single point of failure. A multisig admin (e.g. Safe) is the production answer.
- The chain proves *what was recorded*, not that the physical stock matches. Pair it with periodic stock-takes (`adjustQuantity` exists for this).
- Event queries on public RPC endpoints can be slow or range-limited; set `VITE_DEPLOY_BLOCK`.

## Quick start

Prerequisites: Node 18+, MetaMask, and Sepolia ETH (or a local chain).

```bash
npm install --legacy-peer-deps      # or: bun install
cp .env.example .env                # Windows cmd: copy .env.example .env
```

### 1. Run the contract tests

```bash
npm run test:contract
```

### 2. Deploy the contract

**Local chain** (fastest for development):

```bash
npm run chain                       # terminal 1
npm run deploy:local                # terminal 2, prints the .env values
```

Add a Hardhat account to MetaMask (network `Localhost 8545`, chain id 31337).

**Sepolia** with Hardhat:

```bash
export SEPOLIA_RPC_URL=...          # e.g. from Alchemy / Infura
export DEPLOYER_PRIVATE_KEY=...     # a throwaway testnet key, never a real one
npm run deploy:sepolia
```

Or paste `src/contracts/DrugInventory.sol` into [Remix](https://remix.ethereum.org), compile with
Solidity **0.8.19**, and deploy. The deploying wallet becomes admin.

The deploy script prints `VITE_CONTRACT_ADDRESS` and `VITE_DEPLOY_BLOCK`. Put them in `.env`.

If you deployed with **Remix**, the script doesn't run, so fill them in by hand:
`VITE_CONTRACT_ADDRESS` is the address under "Deployed Contracts", and `VITE_DEPLOY_BLOCK` is the
block number of the deployment transaction (shown on Sepolia Etherscan). Restart `npm run dev` after
editing `.env`. Use "Injected Provider - MetaMask" with MetaMask on Sepolia, not the Remix VM.

To verify on Etherscan, use the same compiler settings as the deploy (0.8.19, optimizer on, 200 runs for
the Hardhat build). A mismatch fails verification.

### 3. Run the app

```bash
npm run dev                         # http://localhost:5173
```

Connect MetaMask. The deployer lands on the Admin Dashboard. Use **Staff** to authorize other wallets.

### 4. Try it with sample data

`drug-import-sample.csv` is a small file for checking the format. `drug-import-nigeria-sample.csv`
(if you add it to the repo) has 27 commonly stocked drugs, including a few low-stock and soon-to-expire
rows so the dashboard has something to flag. Registration numbers in it are placeholders, not real
NAFDAC numbers. Expired dates are rejected by the importer.

## Project structure

```
src/
  contracts/DrugInventory.sol      # the contract (single source of truth)
  Abi/DrugInventoryABI.json        # generated from it, see "Changing the contract"
  config.ts                        # env-driven configuration
  services/drugInventoryService.ts # all contract calls (ethers v6)
  contexts/BlockchainContext.tsx   # wallet, role, data and actions
  pages/                           # Landing, AdminDashboard, PharmacyDashboard
  components/shared/               # DrugCard, StockActions, StaffManagement, ...
  utils/                           # csvParser, dates
test/DrugInventory.test.cjs        # contract tests
scripts/deploy.cjs                 # deploy + prints env values
```

Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, ethers v6, Solidity 0.8.19, Hardhat.

Visual design: a flat "stock register" look (bottle green on paper grey, ruled tables, no gradients).
Colours are HSL tokens in `src/index.css`; fonts are Bricolage Grotesque and Hanken Grotesk.

## Changing the contract

After editing `DrugInventory.sol`:

```bash
npm run compile
node -e "require('fs').writeFileSync('src/Abi/DrugInventoryABI.json', JSON.stringify(require('./artifacts/src/contracts/DrugInventory.sol/DrugInventory.json').abi, null, 2))"
npm run test:contract
```

Then redeploy and update `.env`. Deployed contracts are immutable, so old addresses keep the old code.

## Troubleshooting

- **"VITE_CONTRACT_ADDRESS is not set"**: create `.env` from `.env.example` and restart `npm run dev`.
- **"No contract found at ... on chain ..."**: MetaMask is on a different network than where you deployed.
- **"This wallet is not authorized"**: it is read-only until the admin grants it access in the Staff tab.
- **Audit log fails to load**: set `VITE_DEPLOY_BLOCK` to the deployment block, or use an RPC provider without a tight `eth_getLogs` range limit.
- **Sepolia ETH not showing in MetaMask**: check the faucet's recipient address matches your active account, and switch MetaMask to Sepolia (enable "Show test networks").
- **`git am` fails on CSV or analytics files**: those files use Windows line endings. Use `git am --keep-cr <patch>`; if a session is stuck, run `git am --abort` first.
- **Empty dashboard after a redeploy**: you're pointing at the old address. Update `.env`.

## Possible next steps

- Public batch-verification page (read-only, no login, no personal data)
- Stricter handling for controlled drugs (e.g. mandatory reason codes, second approval)
- Multisig admin (e.g. Safe) instead of a single key
- Etherscan-verified contract and a deployed demo

## License

MIT (see the SPDX header in the contract). Add a `LICENSE` file with your name before publishing.