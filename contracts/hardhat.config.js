require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 500 },
      viaIR: true
    }
  },
  networks: {
    xlayer: {
      url: process.env.XLAYER_RPC || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
