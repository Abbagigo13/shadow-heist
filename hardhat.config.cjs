require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");

const { vars } = require("hardhat/config");

const mnemonic = vars.get(
  "MNEMONIC",
  "test test test test test test test test test test test junk",
);
const infuraApiKey = vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");

module.exports = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      accounts: { mnemonic },
      chainId: 31337,
    },
    localhost: {
      accounts: { mnemonic },
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      accounts: { mnemonic, count: 10 },
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${infuraApiKey}`,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: { bytecodeHash: "none" },
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
};
