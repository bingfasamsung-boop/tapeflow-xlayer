window.TAPEFLOW_X_CONFIG = Object.freeze({
  version: "2.9.0-xlayer-okx-connect",
  chainId: 196,
  chainHex: "0xc4",
  chainName: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"],
  explorer: "https://www.oklink.com/xlayer",
  feeRecipient: "0x382e86E61b8C3aD6c32b8EEfdF81C5E9819703e6",
  fees: { packetBps: 10, escrowBps: 100, privacyBps: 100 },
  contracts: {
    hub: "0xD0FeCB3371d5DdCde9bfeF436D1E0DFBa8B8e074",
    escrow: "0x1913374b8B09C02eE1aC85d5215785aaeB99ca04",
    packetV2: "0xAEbAc1a120908E8E3a860b2f7a30b4052463C436",
    packetLegacyV3: "0x835013abde483776e80B8D1100935399b5DE7c0a",
    policy: "0xf3abe290C5086b39e7E25A8786A18Ce53E08e47A",
    circuitPolicy: "0x73Bebf28704e0D4e56eDD559291484c18C091Ed5",
    intent: "0xA0b0308bE0bD57700ac1C6Abdf0Df80Fa46cB479",
    lock: "0x83Fe48c687Da4557668a7DAb937B638DD75FdE2f",
    priceOracle: "0x6fE2CAcE8c8cD8D5f833aC6d9d479E6050e8549c",
    processor: "0x173b0C58d08e053ae6a2c2Ffe4bB51C37C03C9A3",
    circuit: "1.2.247",
    claimAuthorizer: "0xC4537A2e9401CB4425F06ac06A196a0A0A8f11a8",
    privacy: "0x9dD6EE0f62f7D6c5dEb6236973b7176cD0064f60",
    privacyPool: "0xc3848137D254716676FE71d7DB0324d7675090cE",
    privacyDeploymentBlock: 72109101
  },
  services: {
    claimRelayer: "https://api.tapeflow.world",
    oraclePublisherSigner: "0x1B6cF2Af00f3a2BF15D792DDf9a90b0411279D7b",
    oidcIssuer: "",
    oidcClientId: "",
    oidcAudience: "",
    oidcScope: "openid profile email",
    oidcTokenField: "access_token",
    privacyRelayer: "https://api.tapeflow.world/privacy-relayer",
    privacyAsp: "https://api.tapeflow.world/privacy",
    privacyRpc: "https://api.tapeflow.world/privacy/rpc"
  },
  tapeSend: {
    hub: "0xe61a9c7213a6aa616c246a2b569e555b417b25ee",
    implementation: "0xdcc57797089ebd9f26e686379a4323f353a3f9c6",
    sealed: false,
    sourceCommit: "f1831a44160e7a5a31385c05f1cdf64f25619516"
  },
  tokens: []
});
