// Deploys DrugInventory and prints the values the frontend needs.
//   npx hardhat node                                   (terminal 1, local chain)
//   npx hardhat run scripts/deploy.cjs --network localhost
//   npx hardhat run scripts/deploy.cjs --network sepolia   (needs SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY)
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const inventory = await (await hre.ethers.getContractFactory("DrugInventory")).deploy();
  const receipt = await inventory.deploymentTransaction().wait();
  const address = await inventory.getAddress();

  console.log("\nDrugInventory deployed.");
  console.log("The deployer is the admin:", deployer.address);
  console.log("\nAdd these to your .env:\n");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_DEPLOY_BLOCK=${receipt.blockNumber}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
