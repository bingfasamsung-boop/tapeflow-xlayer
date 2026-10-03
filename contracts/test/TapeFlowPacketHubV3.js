const { expect } = require("chai");
const { ethers } = require("hardhat");

async function expectCustomError(promise, name) {
  try {
    await promise;
    expect.fail(`Expected custom error ${name}`);
  } catch (error) {
    expect(String(error.message)).to.include(name);
  }
}

describe("TapeFlow Packet Hub V3", function () {
  async function fixture() {
    const [creator, recipient, relayer, feeRecipient] = await ethers.getSigners();
    const hub = await (await ethers.getContractFactory("TapeFlowPacketHubV3")).deploy(creator.address, feeRecipient.address);
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const secret = ethers.hexlify(ethers.randomBytes(32));
    await hub.createLuckyPacket(
      ethers.ZeroAddress,
      1_000n,
      2,
      now + 3_600,
      ethers.keccak256(secret),
      ethers.id("lucky-v3"),
      { value: 1_001n }
    );
    return { creator, recipient, relayer, hub, secret };
  }

  it("lets a gas relayer activate while preserving creator-only V2 reveal", async function () {
    const { relayer, hub, secret } = await fixture();
    await expectCustomError(hub.connect(relayer).revealLucky(1, secret), "NotAuthorized");
    await ethers.provider.send("evm_mine");
    await hub.connect(relayer).activateLucky(1, secret);
    const packet = await hub.packets(1);
    expect(packet.randomSeed).to.not.equal(ethers.ZeroHash);
  });

  it("does not let a relayer activate with the wrong secret", async function () {
    const { relayer, hub } = await fixture();
    await ethers.provider.send("evm_mine");
    await expectCustomError(hub.connect(relayer).activateLucky(1, ethers.hexlify(ethers.randomBytes(32))), "InvalidSecret");
  });

  it("keeps activation separate from claiming and cannot redirect funds", async function () {
    const { recipient, relayer, hub, secret } = await fixture();
    await ethers.provider.send("evm_mine");
    const relayerBefore = await ethers.provider.getBalance(relayer.address);
    await hub.connect(relayer).activateLucky(1, secret);
    const relayerAfterActivation = await ethers.provider.getBalance(relayer.address);
    expect(relayerAfterActivation < relayerBefore).to.equal(true);
    await hub.connect(recipient).claimLucky(1);
    expect(await hub.claimedAddress(1, recipient.address)).to.equal(true);
  });
});
