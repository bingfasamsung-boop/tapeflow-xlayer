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

describe("TapeFlow Escrow V2", function () {
  async function fixture() {
    const [payer, payee, customArbiter, tapeFlow, outsider, feeRecipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const tapeFlowEndpoint = ethers.id("tapeflow-endpoint");
    const escrow = await (await ethers.getContractFactory("TapeFlowEscrowV2")).deploy(tapeFlow.address, tapeFlowEndpoint, feeRecipient.address);
    await token.approve(await escrow.getAddress(), ethers.MaxUint256);
    return { payer, payee, customArbiter, tapeFlow, outsider, feeRecipient, token, escrow, tapeFlowEndpoint };
  }

  async function create({ escrow, token, payee, arbiter = ethers.ZeroAddress, arbiterEndpoint = ethers.ZeroHash, arbiterReward = 0n }) {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const [payer] = await ethers.getSigners();
    await escrow.registerInboxKey(ethers.id("payer-inbox"));
    await escrow.connect(payee).registerInboxKey(ethers.id("payee-inbox"));
    await escrow.createEscrow(
      await token.getAddress(), payee.address, arbiter, 1_000n, arbiterReward, now + 3600, 3600,
      ethers.id("order"), ethers.id("payer-endpoint"), ethers.id("payee-endpoint"), arbiterEndpoint,
      ethers.id(`case-${payer.address}`), "0x010203", "0x040506"
    );
  }

  it("uses TapeFlow as the default arbiter and indexes both parties", async function () {
    const { payee, tapeFlow, token, escrow, tapeFlowEndpoint } = await fixture();
    await create({ escrow, token, payee });
    const order = await escrow.escrows(1);
    expect(order.arbiter).to.equal(tapeFlow.address);
    expect(order.arbiterEndpoint).to.equal(tapeFlowEndpoint);
    expect(await escrow.payerEscrowCount((await ethers.getSigners())[0].address)).to.equal(1n);
    expect(await escrow.payeeEscrowAt(payee.address, 0)).to.equal(1n);
  });

  it("keeps the arbiter queue empty until a dispute is opened", async function () {
    const { payer, payee, tapeFlow, token, escrow } = await fixture();
    await create({ escrow, token, payee });
    expect(await escrow.arbiterDisputeCount(tapeFlow.address)).to.equal(0n);
    await escrow.connect(payee).openDispute(1, ethers.id("statement-ref"), ethers.id("statement"));
    expect(await escrow.arbiterDisputeCount(tapeFlow.address)).to.equal(1n);
    await expectCustomError(
      escrow.connect(payer).resolveEscrow(1, 500n, 500n, ethers.id("reason")),
      "NotAuthorized"
    );
  });

  it("lets the selected arbiter resolve only a disputed order", async function () {
    const { payee, customArbiter, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom") });
    await expectCustomError(
      escrow.connect(customArbiter).resolveEscrow(1, 400n, 600n, ethers.id("reason")),
      "InvalidState"
    );
    await escrow.connect(payee).openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    await escrow.connect(customArbiter).resolveEscrow(1, 400n, 600n, ethers.id("reason"));
    expect(await token.balanceOf(payee.address)).to.equal(600n);
  });

  it("charges 1% in the payment token and pays an optional reward only when an arbiter resolves", async function () {
    const { payee, customArbiter, feeRecipient, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom"), arbiterReward: 25n });
    const order = await escrow.escrows(1);
    expect(order.serviceFee).to.equal(10n);
    expect(order.arbiterReward).to.equal(25n);
    await escrow.connect(payee).openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    await escrow.connect(customArbiter).resolveEscrow(1, 400n, 600n, ethers.id("reason"));
    expect(await token.balanceOf(feeRecipient.address)).to.equal(10n);
    expect(await token.balanceOf(customArbiter.address)).to.equal(25n);
  });

  it("refunds principal, service fee and unused reward when the seller never delivers", async function () {
    const { payer, payee, token, escrow } = await fixture();
    const before = await token.balanceOf(payer.address);
    await create({ escrow, token, payee, arbiterReward: 25n });
    const order = await escrow.escrows(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(order.deliveryDeadline) + 1]);
    await ethers.provider.send("evm_mine");
    await escrow.refundUndelivered(1);
    expect(await token.balanceOf(payer.address)).to.equal(before);
  });

  it("switches a live dispute to TapeFlow only after both parties approve", async function () {
    const { payer, payee, customArbiter, tapeFlow, token, escrow, tapeFlowEndpoint } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom") });
    await escrow.openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    await escrow.approveTapeFlowFallback(1);
    expect((await escrow.escrows(1)).arbiter).to.equal(customArbiter.address);
    await expectCustomError(
      escrow.connect(tapeFlow).resolveEscrow(1, 500n, 500n, ethers.id("reason")),
      "NotAuthorized"
    );
    await escrow.connect(payee).approveTapeFlowFallback(1);
    const order = await escrow.escrows(1);
    expect(order.arbiter).to.equal(tapeFlow.address);
    expect(order.arbiterEndpoint).to.equal(tapeFlowEndpoint);
    expect(await escrow.arbiterDisputeAt(tapeFlow.address, 0)).to.equal(1n);
    await escrow.connect(tapeFlow).resolveEscrow(1, 500n, 500n, ethers.id("reason"));
  });

  it("gives TapeFlow parallel authority after fifteen days without removing the appointed arbiter", async function () {
    const { payee, customArbiter, tapeFlow, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom") });
    await escrow.connect(payee).openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    await expectCustomError(escrow.connect(tapeFlow).activateTapeFlowIntervention(1), "TooEarly");
    const order = await escrow.escrows(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(order.disputedAt) + 15 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    await escrow.connect(tapeFlow).activateTapeFlowIntervention(1);
    expect((await escrow.escrows(1)).arbiter).to.equal(customArbiter.address);
    expect(await escrow.tapeFlowIntervened(1)).to.equal(true);
    await escrow.connect(tapeFlow).anchorMessage(1, 1, ethers.id("tapeflow-ref"), ethers.id("tapeflow-evidence"));
    await escrow.connect(customArbiter).resolveEscrow(1, 500n, 500n, ethers.id("reason"));
  });

  it("lets TapeFlow resolve first after the fifteen-day intervention is activated", async function () {
    const { payee, customArbiter, tapeFlow, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom") });
    await escrow.openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    const order = await escrow.escrows(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(order.disputedAt) + 15 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    await escrow.connect(tapeFlow).activateTapeFlowIntervention(1);
    await escrow.connect(tapeFlow).resolveEscrow(1, 700n, 300n, ethers.id("tapeflow-reason"));
    expect((await escrow.escrows(1)).status).to.equal(6n);
    await expectCustomError(
      escrow.connect(customArbiter).resolveEscrow(1, 500n, 500n, ethers.id("late-reason")),
      "InvalidState"
    );
  });

  it("allows only parties before dispute and the arbiter after dispute to anchor TapeSend messages", async function () {
    const { payee, customArbiter, outsider, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.id("custom") });
    await expectCustomError(
      escrow.connect(customArbiter).anchorMessage(1, 0, ethers.id("ref"), ethers.id("body")),
      "NotAuthorized"
    );
    await escrow.connect(payee).anchorMessage(1, 0, ethers.id("ref-1"), ethers.id("body-1"));
    await expectCustomError(
      escrow.connect(outsider).anchorMessage(1, 0, ethers.id("ref-2"), ethers.id("body-2")),
      "NotAuthorized"
    );
    await escrow.openDispute(1, ethers.id("dispute-ref"), ethers.id("dispute"));
    await escrow.connect(customArbiter).anchorMessage(1, 1, ethers.id("ref-3"), ethers.id("body-3"));
  });

  it("supports wallet-only encrypted messaging and keeps pre-dispute history from the arbiter", async function () {
    const { payer, payee, customArbiter, outsider, token, escrow } = await fixture();
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.ZeroHash });
    const cipher = ethers.toUtf8Bytes("authenticated ciphertext");
    await escrow.postEncryptedMessage(1, 0, cipher, ethers.ZeroHash);
    expect(await escrow.encryptedMessageCount(1)).to.equal(1n);
    expect(await escrow.connect(payee).encryptedMessageCount(1)).to.equal(1n);
    await expectCustomError(escrow.connect(customArbiter).encryptedMessageCount(1), "NotAuthorized");
    await expectCustomError(escrow.connect(outsider).encryptedMessageCount(1), "NotAuthorized");
    expect(await escrow.caseKeyEnvelope(1, payer.address)).to.equal("0x010203");
    expect(await escrow.connect(payee).caseKeyEnvelope(1, payee.address)).to.equal("0x040506");
  });

  it("does not let an inbox key change after registration", async function () {
    const { escrow } = await fixture();
    await escrow.registerInboxKey(ethers.id("stable-inbox"));
    await escrow.registerInboxKey(ethers.id("stable-inbox"));
    await expectCustomError(escrow.registerInboxKey(ethers.id("replacement-inbox")), "InvalidState");
  });

  it("grants full encrypted history to the appointed arbiter only after dispute", async function () {
    const { payee, customArbiter, token, escrow } = await fixture();
    await escrow.connect(customArbiter).registerInboxKey(ethers.id("arbiter-inbox"));
    await create({ escrow, token, payee, arbiter: customArbiter.address, arbiterEndpoint: ethers.ZeroHash });
    await escrow.postEncryptedMessage(1, 0, ethers.toUtf8Bytes("before dispute"), ethers.ZeroHash);
    await expectCustomError(escrow.grantCaseKey(1, customArbiter.address, "0x0102"), "NotAuthorized");
    await escrow.connect(payee).openDispute(1, ethers.id("ref"), ethers.id("evidence"));
    await escrow.grantCaseKey(1, customArbiter.address, "0x070809");
    expect(await escrow.connect(customArbiter).caseKeyEnvelope(1, customArbiter.address)).to.equal("0x070809");
    expect(await escrow.connect(customArbiter).encryptedMessageCount(1)).to.equal(1n);
    await expectCustomError(escrow.grantCaseKey(1, customArbiter.address, "0x0a"), "InvalidState");
  });

  it("releases automatically after the review window unless disputed", async function () {
    const { payee, token, escrow } = await fixture();
    await create({ escrow, token, payee });
    await escrow.connect(payee).markDelivered(1, ethers.id("proof-ref"), ethers.id("proof"));
    await expectCustomError(escrow.finalizeAfterReview(1), "TooEarly");
    const order = await escrow.escrows(1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(order.deliveredAt + order.reviewPeriod)]);
    await ethers.provider.send("evm_mine");
    await escrow.finalizeAfterReview(1);
    expect(await token.balanceOf(payee.address)).to.equal(1_000n);
  });
});
