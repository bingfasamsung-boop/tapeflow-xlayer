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

describe("TapeLock V1", function () {
  async function fixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const adapter = await (await ethers.getContractFactory("MockPriceAdapter")).deploy(
      await token.getAddress(),
      ethers.encodeBytes32String("USD"),
      ethers.parseEther("1")
    );
    const vault = await (await ethers.getContractFactory("TapeLockV1")).deploy([await adapter.getAddress()]);
    await token.approve(await vault.getAddress(), ethers.MaxUint256);
    return { owner, alice, bob, token, adapter, vault };
  }

  it("creates a non-cancelable self time lock and releases it permissionlessly", async function () {
    const { owner, alice, token, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await vault.createLock(
      await token.getAddress(), owner.address, 1_000n, now + 600, 0, 0, 0,
      ethers.ZeroAddress, 0, 0, ethers.id("self")
    );
    await expectCustomError(vault.connect(alice).claim(1), "NotClaimable");
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 601]);
    await ethers.provider.send("evm_mine");
    await vault.connect(alice).claim(1);
    expect((await vault.locks(1)).claimed).to.equal(true);
    expect(await token.balanceOf(await vault.getAddress())).to.equal(0n);
  });

  it("indexes gifts by beneficiary for walletless read-only lookup", async function () {
    const { alice, token, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await vault.createLock(
      await token.getAddress(), alice.address, 500n, now + 600, 0, 0, 0,
      ethers.ZeroAddress, 0, 0, ethers.id("gift")
    );
    expect(await vault.beneficiaryLockCount(alice.address)).to.equal(1n);
    expect(await vault.beneficiaryLockAt(alice.address, 0)).to.equal(1n);
    expect((await vault.locks(1)).beneficiary).to.equal(alice.address);
  });

  it("requires two qualifying oracle updates separated by the confirmation delay", async function () {
    const { alice, token, adapter, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await vault.createLock(
      await token.getAddress(), alice.address, 2_000n, 0, now + 86_400, 1, 0,
      await adapter.getAddress(), ethers.parseEther("2"), 300, ethers.id("price")
    );
    await adapter.setPrice(ethers.parseEther("2.1"));
    await vault.checkPrice(1);
    await expectCustomError(vault.claim(1), "NotClaimable");
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 302]);
    await ethers.provider.send("evm_mine");
    await adapter.setPrice(ethers.parseEther("2.2"));
    expect((await vault.status(1)).claimable).to.equal(true);
    await vault.claim(1);
    expect(await token.balanceOf(alice.address)).to.equal(2_000n);
  });

  it("resets confirmation after a failing price observation", async function () {
    const { alice, token, adapter, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await vault.createLock(
      await token.getAddress(), alice.address, 100n, 0, now + 86_400, 1, 0,
      await adapter.getAddress(), ethers.parseEther("2"), 300, ethers.id("reset")
    );
    await adapter.setPrice(ethers.parseEther("2.1"));
    await vault.checkPrice(1);
    expect((await vault.locks(1)).priceFirstConfirmedAt).to.not.equal(0n);
    await adapter.setPrice(ethers.parseEther("1.9"));
    await vault.checkPrice(1);
    expect((await vault.locks(1)).priceFirstConfirmedAt).to.equal(0n);
  });

  it("supports time-and-price plus a guaranteed fallback release", async function () {
    const { alice, token, adapter, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await vault.createLock(
      await token.getAddress(), alice.address, 900n, now + 600, now + 1_200, 2, 0,
      await adapter.getAddress(), ethers.parseEther("5"), 300, ethers.id("and")
    );
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 1_201]);
    await ethers.provider.send("evm_mine");
    expect((await vault.status(1)).claimable).to.equal(true);
    await vault.claim(1);
    expect(await token.balanceOf(alice.address)).to.equal(900n);
  });

  it("rejects unapproved or asset-mismatched price adapters", async function () {
    const { alice, token, vault } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const foreign = await (await ethers.getContractFactory("MockPriceAdapter")).deploy(
      ethers.ZeroAddress,
      ethers.encodeBytes32String("USD"),
      ethers.parseEther("1")
    );
    await expectCustomError(
      vault.createLock(
        await token.getAddress(), alice.address, 100n, 0, now + 3_600, 1, 0,
        await foreign.getAddress(), ethers.parseEther("2"), 300, ethers.id("bad")
      ),
      "AdapterNotAllowed"
    );
  });

  it("rejects a non-USD quote even when its adapter is allowed", async function () {
    const { alice, token } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const okbQuote = await (await ethers.getContractFactory("MockPriceAdapter")).deploy(
      await token.getAddress(),
      ethers.encodeBytes32String("OKB"),
      ethers.parseEther("1")
    );
    const isolatedVault = await (await ethers.getContractFactory("TapeLockV1")).deploy([await okbQuote.getAddress()]);
    await token.approve(await isolatedVault.getAddress(), ethers.MaxUint256);
    await expectCustomError(
      isolatedVault.createLock(
        await token.getAddress(), alice.address, 100n, 0, now + 3_600, 1, 0,
        await okbQuote.getAddress(), ethers.parseEther("2"), 300, ethers.id("quote")
      ),
      "InvalidPrice"
    );
  });

  it("contains no owner, cancellation, fee switch, upgrade or arbitrary withdrawal", async function () {
    const { vault } = await fixture();
    expect(vault.interface.hasFunction("owner")).to.equal(false);
    expect(vault.interface.hasFunction("cancel")).to.equal(false);
    expect(vault.interface.hasFunction("withdraw")).to.equal(false);
    expect(vault.interface.hasFunction("upgradeToAndCall")).to.equal(false);
  });
});
