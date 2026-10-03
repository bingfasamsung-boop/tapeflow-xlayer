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

describe("TapeFlow Packet Hub V2", function () {
  async function fixture() {
    const [creator, recipient, relayer, attacker, feeRecipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const hub = await (await ethers.getContractFactory("TapeFlowPacketHubV2")).deploy(creator.address, feeRecipient.address);
    await token.approve(await hub.getAddress(), ethers.MaxUint256);
    return { creator, recipient, relayer, attacker, feeRecipient, token, hub };
  }

  async function signVoucher(hub, signer, voucher) {
    const network = await ethers.provider.getNetwork();
    return signer.signTypedData(
      {
        name: "TapeFlow Packet Hub",
        version: "2",
        chainId: network.chainId,
        verifyingContract: await hub.getAddress()
      },
      {
        ClaimVoucher: [
          { name: "packetId", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "identityNullifier", type: "bytes32" },
          { name: "voucherNonce", type: "uint256" },
          { name: "validUntil", type: "uint64" }
        ]
      },
      voucher
    );
  }

  it("lets a relayer pay gas while the login-bound recipient receives an equal packet", async function () {
    const { creator, recipient, relayer, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createEqualPacket(ethers.ZeroAddress, 100n, 2, now + 3600, ethers.id("hello"), { value: 201n });

    const voucher = {
      packetId: 1n,
      recipient: recipient.address,
      identityNullifier: ethers.id("oidc-user-1/packet-1"),
      voucherNonce: 7n,
      validUntil: now + 600
    };
    const signature = await signVoucher(hub, creator, voucher);
    const recipientBefore = await ethers.provider.getBalance(recipient.address);
    const relayerBefore = await ethers.provider.getBalance(relayer.address);
    const receipt = await (await hub.connect(relayer).claimEqualTo(voucher, signature)).wait();
    const relayerAfter = await ethers.provider.getBalance(relayer.address);

    expect(await ethers.provider.getBalance(recipient.address)).to.equal(recipientBefore + 100n);
    expect(relayerAfter).to.equal(relayerBefore - receipt.gasUsed * receipt.gasPrice);
    await expectCustomError(hub.connect(relayer).claimEqualTo(voucher, signature), "InvalidVoucher");
  });

  it("rejects voucher tampering and duplicate login identities", async function () {
    const { creator, recipient, relayer, attacker, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createEqualPacket(ethers.ZeroAddress, 5n, 3, now + 3600, ethers.id("equal"), { value: 16n });
    const identityNullifier = ethers.id("oidc-user-2/packet-1");
    const voucher = { packetId: 1n, recipient: recipient.address, identityNullifier, voucherNonce: 1n, validUntil: now + 600 };
    const signature = await signVoucher(hub, creator, voucher);

    await expectCustomError(
      hub.connect(relayer).claimEqualTo({ ...voucher, recipient: attacker.address }, signature),
      "InvalidVoucher"
    );
    await hub.connect(relayer).claimEqualTo(voucher, signature);

    const secondVoucher = { ...voucher, recipient: attacker.address, voucherNonce: 2n };
    const secondSignature = await signVoucher(hub, creator, secondVoucher);
    await expectCustomError(hub.connect(relayer).claimEqualTo(secondVoucher, secondSignature), "AlreadyClaimed");
  });

  it("allows anyone to execute a directed packet but only the fixed recipient is paid", async function () {
    const { recipient, relayer, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await hub.createDirectedPacket(await token.getAddress(), recipient.address, 300n, now + 3600, ethers.id("directed"));
    await hub.connect(relayer).claimDirected(1);
    expect(await token.balanceOf(recipient.address)).to.equal(300n);
    expect(await token.balanceOf(relayer.address)).to.equal(0n);
  });

  it("supports a walletless password packet without revealing a payer address to the recipient", async function () {
    const { creator, recipient, relayer, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const passwordDigest = ethers.id("open-sesame");
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const passwordHash = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [passwordDigest, salt]);
    await hub.createPasswordPacket(await token.getAddress(), passwordHash, salt, 50n, 2, now + 3600, ethers.id("password"));

    const voucher = {
      packetId: 1n,
      recipient: recipient.address,
      identityNullifier: ethers.id("oidc-user-3/packet-1"),
      voucherNonce: 1n,
      validUntil: now + 600
    };
    const signature = await signVoucher(hub, creator, voucher);
    await hub.connect(relayer).claimPasswordTo(voucher, passwordDigest, signature);
    expect(await token.balanceOf(recipient.address)).to.equal(50n);
  });

  it("charges the immutable 0.1% fee in the same token", async function () {
    const { recipient, feeRecipient, token, hub } = await fixture();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const before = await token.balanceOf(feeRecipient.address);
    await hub.createDirectedPacket(await token.getAddress(), recipient.address, 10_000n, now + 3600, ethers.id("fee"));
    expect(await token.balanceOf(feeRecipient.address)).to.equal(before + 10n);
    expect(await hub.quoteServiceFee(10_001n)).to.equal(11n);
  });

  it("has no owner, proxy upgrade or arbitrary withdrawal", async function () {
    const { hub } = await fixture();
    expect(hub.interface.hasFunction("owner")).to.equal(false);
    expect(hub.interface.hasFunction("upgradeToAndCall")).to.equal(false);
    expect(hub.interface.hasFunction("withdraw")).to.equal(false);
  });
});
