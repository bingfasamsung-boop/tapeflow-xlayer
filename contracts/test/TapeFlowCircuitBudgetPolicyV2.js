const { expect } = require("chai");
const { ethers } = require("hardhat");

async function expectCustomError(promise, name) {
  try { await promise; expect.fail(`Expected custom error ${name}`); }
  catch (error) { expect(String(error.message)).to.include(name); }
}

describe("TapeFlow Circuit Budget Policy V2", function () {
  async function fixture() {
    const [payer, recipient, other, feeRecipient] = await ethers.getSigners();
    const tokenA = await (await ethers.getContractFactory("MockToken")).deploy();
    const tokenB = await (await ethers.getContractFactory("MockToken")).deploy();
    const hub = await (await ethers.getContractFactory("TapeFlowXHubV1")).deploy(feeRecipient.address);
    const evaluator = await (await ethers.getContractFactory("MockTapeOutCircuitEvaluator")).deploy();
    const policy = await (await ethers.getContractFactory("TapeFlowCircuitBudgetPolicyV2")).deploy(
      await hub.getAddress(), await evaluator.getAddress(), 1n
    );
    await tokenA.approve(await hub.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await hub.getAddress(), ethers.MaxUint256);
    return { payer, recipient, other, tokenA, tokenB, hub, evaluator, policy };
  }

  it("keeps independent raw-unit budgets for each token", async function () {
    const { recipient, tokenA, tokenB, hub, policy } = await fixture();
    await policy.setBudget(await tokenA.getAddress(), 100n, 150n, false);
    await policy.setBudget(await tokenB.getAddress(), 1_000_000n, 2_000_000n, false);

    await hub.payToken(await tokenA.getAddress(), recipient.address, 80n, ethers.id("token-a"), await policy.getAddress(), "0x");
    await hub.payToken(await tokenB.getAddress(), recipient.address, 900_000n, ethers.id("token-b"), await policy.getAddress(), "0x");
    await expectCustomError(
      hub.payToken(await tokenA.getAddress(), recipient.address, 101n, ethers.id("token-a-over"), await policy.getAddress(), "0x"),
      "PaymentDenied"
    );
    expect((await policy.budgets(await tokenA.runner.getAddress(), await tokenA.getAddress())).spentToday).to.equal(80n);
    expect((await policy.budgets(await tokenB.runner.getAddress(), await tokenB.getAddress())).spentToday).to.equal(900_000n);
  });

  it("keeps allowlists and freeze state isolated per token", async function () {
    const { recipient, other, tokenA, tokenB, hub, policy } = await fixture();
    const a=await tokenA.getAddress(),b=await tokenB.getAddress();
    await policy.setBudget(a, 0n, 0n, true);
    await policy.setRecipient(a, recipient.address, true);
    await policy.setBudget(b, 0n, 0n, false);
    await policy.setFrozen(b, true);

    await hub.payToken(a, recipient.address, 1n, ethers.id("allow-a"), await policy.getAddress(), "0x");
    await expectCustomError(hub.payToken(a, other.address, 1n, ethers.id("deny-a"), await policy.getAddress(), "0x"), "PaymentDenied");
    await expectCustomError(hub.payToken(b, recipient.address, 1n, ethers.id("frozen-b"), await policy.getAddress(), "0x"), "PaymentDenied");
  });

  it("rejects direct callers that bypass the hub", async function () {
    const { recipient, tokenA, policy } = await fixture();
    await expectCustomError(policy.validate(recipient.address, await tokenA.getAddress(), recipient.address, 1n, ethers.ZeroHash, "0x"), "NotHub");
  });
});
