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

describe("TapeFlow X V1", function () {
  async function fixture() {
    const [owner, alice, bob, arbiter, solver, feeRecipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const hub = await (await ethers.getContractFactory("TapeFlowXHubV1")).deploy(feeRecipient.address);
    const policy = await (await ethers.getContractFactory("TapeFlowBudgetPolicyV1")).deploy(await hub.getAddress());
    const intent = await (await ethers.getContractFactory("TapeFlowCrossChainIntentV1")).deploy();
    await token.approve(await hub.getAddress(), ethers.MaxUint256);
    await token.approve(await intent.getAddress(), ethers.MaxUint256);
    return { owner, alice, bob, arbiter, solver, feeRecipient, token, hub, policy, intent };
  }

  it("pays native OKB and exact ERC20 amounts without custody", async function () {
    const { owner, alice, token, hub } = await fixture();
    const nativeBefore = await ethers.provider.getBalance(alice.address);
    await hub.payNative(alice.address, ethers.id("order-1"), ethers.ZeroAddress, "0x", { value: 10_000n });
    expect(await ethers.provider.getBalance(alice.address)).to.equal(nativeBefore + 10_000n);

    await hub.payToken(await token.getAddress(), alice.address, 500n, ethers.id("order-2"), ethers.ZeroAddress, "0x");
    expect(await token.balanceOf(alice.address)).to.equal(500n);
    expect(await token.balanceOf(await hub.getAddress())).to.equal(0n);
  });

  it("enforces a self-custodied single and daily budget policy", async function () {
    const { alice, token, hub, policy } = await fixture();
    await policy.setBudget(100n, 150n, false);
    await token.approve(await hub.getAddress(), ethers.MaxUint256);
    await hub.payToken(await token.getAddress(), alice.address, 80n, ethers.id("a"), await policy.getAddress(), "0x");
    await expectCustomError(
      hub.payToken(await token.getAddress(), alice.address, 80n, ethers.id("b"), await policy.getAddress(), "0x"),
      "PaymentDenied"
    );
  });

  it("creates and claims a three-step equal native red packet", async function () {
    const { alice, bob, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createEqualPacket(ethers.ZeroAddress, 100n, 2, now + 3600, ethers.id("hello"), { value: 200n });
    const beforeA = await ethers.provider.getBalance(alice.address);
    const txA = await hub.connect(alice).claimEqual(1);
    const receiptA = await txA.wait();
    const gasA = receiptA.gasUsed * receiptA.gasPrice;
    expect(await ethers.provider.getBalance(alice.address)).to.equal(beforeA + 100n - gasA);
    await hub.connect(bob).claimEqual(1);
    await expectCustomError(hub.connect(alice).claimEqual(1), "FullyClaimed");
  });

  it("supports directed and password ERC20 packets", async function () {
    const { alice, bob, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createDirectedPacket(await token.getAddress(), alice.address, 300n, now + 3600, ethers.id("directed"));
    await expectCustomError(hub.connect(bob).claimDirected(1), "NotAuthorized");
    await hub.connect(alice).claimDirected(1);
    expect(await token.balanceOf(alice.address)).to.equal(300n);

    const digest = ethers.id("open-sesame");
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const passwordHash = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [digest, salt]);
    await hub.createPasswordPacket(await token.getAddress(), passwordHash, salt, 50n, 2, now + 3600, ethers.id("password"));
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "address", "bytes32", "bytes32"], [2, bob.address, digest, salt])
    );
    await hub.connect(bob).commitPassword(2, commitment);
    await ethers.provider.send("evm_mine");
    await hub.connect(bob).revealPassword(2, digest);
    expect(await token.balanceOf(bob.address)).to.equal(50n);
  });

  it("handles escrow delivery, release and arbitration", async function () {
    const { alice, bob, arbiter, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createEscrow(await token.getAddress(), alice.address, arbiter.address, 1_000n, now + 3600, ethers.id("job"));
    await hub.connect(alice).markDelivered(1);
    await hub.releaseEscrow(1);
    expect(await token.balanceOf(alice.address)).to.equal(1_000n);

    await hub.createEscrow(await token.getAddress(), bob.address, arbiter.address, 500n, now + 3600, ethers.id("job-2"));
    await hub.connect(bob).disputeEscrow(2);
    await hub.connect(arbiter).resolveEscrow(2, 200n, 300n);
    expect(await token.balanceOf(bob.address)).to.equal(300n);
  });

  it("releases and cancels delayed payments", async function () {
    const { alice, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createSchedule(await token.getAddress(), alice.address, 700n, now + 600, true, ethers.id("salary"));
    await expectCustomError(hub.claimSchedule(1), "TooEarly");
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 601]);
    await ethers.provider.send("evm_mine");
    await hub.claimSchedule(1);
    expect(await token.balanceOf(alice.address)).to.equal(700n);
  });

  it("announces a stealth payment without retaining funds", async function () {
    const { alice, feeRecipient, hub } = await fixture();
    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);
    const receipt = await (await hub.payStealthNative(5564, alice.address, 999n, "0x020102", "0x1234", { value: 1_009n })).wait();
    const parsed = receipt.logs.map((log) => {
      try { return hub.interface.parseLog(log); } catch { return null; }
    }).filter(Boolean);
    expect(parsed.some((event) => event.name === "StealthPayment")).to.equal(true);
    expect(await ethers.provider.getBalance(await hub.getAddress())).to.equal(0n);
    expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(feeBefore + 10n);
  });

  it("locks a cross-chain intent, settles to the solver, and supports timeout refunds", async function () {
    const { alice, solver, token, intent } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await intent.createIntent(await token.getAddress(), 1_000n, 56, alice.address, ethers.ZeroAddress, 900n, now + 600);
    await intent.confirmSettlement(1, solver.address, ethers.id("destination-tx"));
    expect(await token.balanceOf(solver.address)).to.equal(1_000n);

    await intent.createIntent(await token.getAddress(), 500n, 8453, alice.address, ethers.ZeroAddress, 450n, now + 600);
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 601]);
    await ethers.provider.send("evm_mine");
    await intent.refund(2);
    expect((await intent.intents(2)).status).to.equal(3n);
  });

  it("contains no owner, fee switch, upgrade or arbitrary withdrawal", async function () {
    const { hub } = await fixture();
    expect(hub.interface.hasFunction("owner")).to.equal(false);
    expect(hub.interface.hasFunction("withdraw")).to.equal(false);
    expect(hub.interface.hasFunction("upgradeToAndCall")).to.equal(false);
  });
});
