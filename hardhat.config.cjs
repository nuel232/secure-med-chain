require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY } = process.env;

/** Contract tests: `npm run test:contract`.  Deploy: see scripts/deploy.cjs */
module.exports = {
  solidity: {
    version: "0.8.19",
    // Keep these in sync with the compiler settings you use for Etherscan verification.
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test",
  },
  networks: {
    ...(SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY
      ? { sepolia: { url: SEPOLIA_RPC_URL, accounts: [DEPLOYER_PRIVATE_KEY] } }
      : {}),
  },
};
