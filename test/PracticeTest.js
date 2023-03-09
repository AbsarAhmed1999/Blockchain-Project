const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("PracticeEscrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow;

  beforeEach(async () => {
    // Log out all address come for free. Setup Accounts
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    // Compile RealEstate
    const RealEstate = await ethers.getContractFactory("RealEstate");
    // Deploy RealEstate
    realEstate = await RealEstate.deploy();

    // Mint
    // Here we created NFT --->In our case  House = NFT it has someValue
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();
    // Compile solidity to get ABI and Bytecode
    const Escrow = await ethers.getContractFactory("PracticeEscrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );

    // Approve property
    // Connecting as seller/Or using Seller Account
    // only the seller ---> having an nft can sell not any other person who doesnt own it
    // hence the seller approves the escrow address and nftId to which nft address will be provided to
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();

    //List property
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
  });

  // Test Example
  describe("Deployment", () => {
    it("returns Nft address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });
    it("returns seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });
    it("returns inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });
    it("returns lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("listing", () => {
    it("Updates as listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });
    it("updates OwnerSHip", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });
    it("Returns buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });
    it("Returns purchase price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });
    it("Returns escrow Amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });
  describe("Deposit", () => {
    it("updates contract balances", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
    describe("Inspection", () => {
      it("updates inspection status", async () => {
        const transaction = await escrow
          .connect(inspector)
          .updateInspectionStatus(1, true);
        await transaction.wait();
        const result = await escrow.inspectionPassed(1);
        expect(result).to.be.equal(true);
      });
    });
    describe("Approval", () => {
      it("updates approval status", async () => {
        let transaction = await escrow.connect(buyer).approveSale(1);
        await transaction.wait();

        transaction = await escrow.connect(seller).approveSale(1);
        await transaction.wait();

        transaction = await escrow.connect(lender).approveSale(1);
        await transaction.wait();

        expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
        expect(await escrow.approval(1, seller.address)).to.be.equal(true);
        expect(await escrow.approval(1, lender.address)).to.be.equal(true);
      });
    });
  });
  describe("Sale", async () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      transaction = await escrow.connect(seller).finalizeSale(1);
    });
    it("updates Ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });
    it("Update balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
