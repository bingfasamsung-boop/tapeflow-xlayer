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

describe("TapeFlow Circuit Budget Policy V1", function () {
  async function fixture() {
    const [payer, recipient, other, feeRecipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const hub = await (await ethers.getContractFactory("TapeFlowXHubV1")).deploy(feeRecipient.address);
    const evaluator = await (await ethers.getContractFactory("MockTapeOutCircuitEvaluator")).deploy();
    const policy = await (await ethers.getContractFactory("TapeFlowCircuitBudgetPolicyV1")).deploy(
      await hub.getAddress(),
      await evaluator.getAddress(),
      1n
    );
    await token.approve(await hub.getAddress(), ethers.MaxUint256);
    return { payer, recipient, other, token, hub, evaluator, policy };
  }

  it("allows a payment only when all five TapeOut input conditions are true", async function () {
    const { recipient, token, hub, policy } = await fixture();
    await policy.setBudget(100n, 150n, false);
    await hub.payToken(
      await token.getAddress(),
      recipient.address,
      80n,
      ethers.id("circuit-ok"),
      await policy.getAddress(),
      "0x"
    );
    expect(await token.balanceOf(recipient.address)).to.equal(80n);
  });

  it("denies over-budget, frozen, and non-allowlisted payments through the circuit", async function () {
    const { recipient, other, token, hub, policy } = await fixture();
    await policy.setBudget(100n, 150n, true);
    await policy.setRecipient(recipient.address, true);

    await expectCustomError(
      hub.payToken(await token.getAddress(), recipient.address, 101n, ethers.id("too-big"), await policy.getAddress(), "0x"),
      "PaymentDenied"
    );
    await expectCustomError(
      hub.payToken(await token.getAddress(), other.address, 10n, ethers.id("not-listed"), await policy.getAddress(), "0x"),
      "PaymentDenied"
    );

    await policy.setFrozen(true);
    await expectCustomError(
      hub.payToken(await token.getAddress(), recipient.address, 10n, ethers.id("frozen"), await policy.getAddress(), "0x"),
      "PaymentDenied"
    );
  });

  it("rejects direct callers that bypass the payment hub", async function () {
    const { recipient, policy } = await fixture();
    await expectCustomError(
      policy.validate(
        recipient.address,
        ethers.ZeroAddress,
        recipient.address,
        1n,
        ethers.ZeroHash,
        "0x"
      ),
      "NotHub"
    );
  });
});
