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

describe("TapeFlow Packet Hub V4", function () {
  async function fixture() {
    const [creator, claimant, keeper, feeRecipient] = await ethers.getSigners();
    const hub = await (await ethers.getContractFactory("TapeFlowPacketHubV4")).deploy(creator.address, feeRecipient.address);
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createEqualPacket(
      ethers.ZeroAddress,
      10_000n,
      2,
      now + 180,
      ethers.id("auto-refund-v4"),
      { value: 20_020n }
    );
    return { creator, claimant, keeper, feeRecipient, hub };
  }

  it("rejects automation before the packet deadline", async function () {
    const { keeper, hub } = await fixture();
    await expectCustomError(hub.connect(keeper).refundExpiredPacket(1), "NotExpired");
  });

  it("lets any keeper settle after expiry but pays only the creator", async function () {
    const { creator, claimant, keeper, hub } = await fixture();
    await hub.connect(claimant).claimEqual(1);
    const packetBefore = await hub.packets(1);
    expect(packetBefore.remaining).to.equal(10_000n);
    const creatorBefore = await ethers.provider.getBalance(creator.address);
    const keeperBefore = await ethers.provider.getBalance(keeper.address);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(packetBefore.deadline) + 1]);
    const tx = await hub.connect(keeper).refundExpiredPacket(1);
    const receipt = await tx.wait();
    const creatorAfter = await ethers.provider.getBalance(creator.address);
    const keeperAfter = await ethers.provider.getBalance(keeper.address);
    expect(creatorAfter - creatorBefore).to.equal(10_000n);
    expect(keeperAfter < keeperBefore).to.equal(true);
    expect((await hub.packets(1)).remaining).to.equal(0n);
    const event = receipt.logs.map(log => { try { return hub.interface.parseLog(log); } catch { return null; } }).find(log => log?.name === "PacketRefunded");
    expect(event.args.creator).to.equal(creator.address);
    expect(event.args.amount).to.equal(10_000n);
  });

  it("cannot refund an already empty packet", async function () {
    const { claimant, keeper, hub } = await fixture();
    await hub.connect(claimant).claimEqual(1);
    const secondClaimant = (await ethers.getSigners())[4];
    await hub.connect(secondClaimant).claimEqual(1);
    const packet = await hub.packets(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(packet.deadline) + 1]);
    await expectCustomError(hub.connect(keeper).refundExpiredPacket(1), "InvalidAmount");
  });

  it("keeps the creator-only legacy refund rule", async function () {
    const { keeper, hub } = await fixture();
    const packet = await hub.packets(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(packet.deadline) + 1]);
    await expectCustomError(hub.connect(keeper).refundPacket(1), "NotAuthorized");
  });
});
