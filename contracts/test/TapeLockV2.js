const { expect } = require("chai");
const { ethers } = require("hardhat");

async function expectCustomError(promise, name) {
  try { await promise; expect.fail(`Expected custom error ${name}`); }
  catch (error) { expect(String(error.message)).to.include(name); }
}

describe("TapeFlow Price Oracle V1 and TapeLock V2", function () {
  async function fixture() {
    const [admin, publisher, alice, relayer] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const oracle = await (await ethers.getContractFactory("TapeFlowPriceOracleV1")).deploy(admin.address, publisher.address);
    const vault = await (await ethers.getContractFactory("TapeLockV2")).deploy(await oracle.getAddress());
    await token.approve(await vault.getAddress(), ethers.MaxUint256);
    return { admin, publisher, alice, relayer, token, oracle, vault };
  }

  async function signedObservation(oracle, signer, asset, price, observedAt, validUntil, nonce) {
    const digest = await oracle.priceDigest(asset, price, observedAt, validUntil, nonce);
    return signer.signMessage(ethers.getBytes(digest));
  }

  async function publish(oracle, signer, relayer, asset, price, nonce, timestamp) {
    const observedAt = timestamp ?? (await ethers.provider.getBlock("latest")).timestamp;
    const validUntil = observedAt + 3_000;
    const signature = await signedObservation(oracle, signer, asset, price, observedAt, validUntil, nonce);
    await oracle.connect(relayer).submitPrice(asset, price, observedAt, validUntil, nonce, signature);
    return observedAt;
  }

  it("accepts a signed relayed observation and prevents replay", async function () {
    const { publisher, relayer, token, oracle } = await fixture();
    const asset = await token.getAddress();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const signature = await signedObservation(oracle, publisher, asset, ethers.parseEther("2"), now, now + 3_000, 7);
    await oracle.connect(relayer).submitPrice(asset, ethers.parseEther("2"), now, now + 3_000, 7, signature);
    expect((await oracle.readPrice(asset)).priceE18).to.equal(ethers.parseEther("2"));
    await expectCustomError(
      oracle.connect(relayer).submitPrice(asset, ethers.parseEther("2"), now, now + 3_000, 7, signature),
      "NonceAlreadyUsed"
    );
  });

  it("allows the admin to rotate the publisher without changing the lock contract", async function () {
    const { admin, publisher, alice, relayer, token, oracle } = await fixture();
    await oracle.connect(admin).setSigner(publisher.address, false);
    await oracle.connect(admin).setSigner(alice.address, true);
    await publish(oracle, alice, relayer, await token.getAddress(), ethers.parseEther("1.5"), 1);
    expect((await oracle.priceRecord(await token.getAddress())).signer).to.equal(alice.address);
  });

  it("supports a custom-token price lock with two separated confirmations", async function () {
    const { publisher, alice, relayer, token, oracle, vault } = await fixture();
    const asset = await token.getAddress();
    const now = await publish(oracle, publisher, relayer, asset, ethers.parseEther("2.1"), 1);
    await vault.createLock(asset, alice.address, 2_000n, 0, now + 86_400, 1, 0, ethers.parseEther("2"), 300, ethers.id("price"));
    await vault.checkPrice(1);
    await expectCustomError(vault.claim(1), "NotClaimable");

    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 301]);
    await ethers.provider.send("evm_mine");
    await publish(oracle, publisher, relayer, asset, ethers.parseEther("2.2"), 2, now + 301);
    expect((await vault.status(1)).claimable).to.equal(true);
    await vault.claim(1);
    expect(await token.balanceOf(alice.address)).to.equal(2_000n);
  });

  it("releases through the fallback time even when the oracle stops", async function () {
    const { publisher, alice, relayer, token, oracle, vault } = await fixture();
    const asset = await token.getAddress();
    const now = await publish(oracle, publisher, relayer, asset, ethers.parseEther("1"), 1);
    await vault.createLock(asset, alice.address, 900n, 0, now + 3_600, 1, 0, ethers.parseEther("5"), 300, ethers.id("fallback"));
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 3_601]);
    await ethers.provider.send("evm_mine");
    expect((await vault.status(1)).claimable).to.equal(true);
    await vault.claim(1);
    expect(await token.balanceOf(alice.address)).to.equal(900n);
  });

  it("rejects stale prices when creating a new price lock", async function () {
    const { publisher, alice, relayer, token, oracle, vault } = await fixture();
    const asset = await token.getAddress();
    const now = await publish(oracle, publisher, relayer, asset, ethers.parseEther("1"), 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 3_601]);
    await ethers.provider.send("evm_mine");
    await expectCustomError(
      vault.createLock(asset, alice.address, 100n, 0, now + 86_400, 1, 0, ethers.parseEther("2"), 300, ethers.id("stale")),
      "InvalidPrice"
    );
  });
});
