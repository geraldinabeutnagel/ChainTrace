const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TraceRegistry", function () {
  let traceRegistry;
  let accessControl;
  let owner;
  let manufacturer;
  let logistics;
  let retailer;
  let verifier;
  let addrs;

  beforeEach(async function () {
    [owner, manufacturer, logistics, retailer, verifier, ...addrs] = await ethers.getSigners();

    // Deploy AccessControl first
    const AccessControl = await ethers.getContractFactory("ChainTraceAccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.deployed();

    // Deploy TraceRegistry
    const TraceRegistry = await ethers.getContractFactory("TraceRegistry");
    traceRegistry = await TraceRegistry.deploy();
    await traceRegistry.deployed();

    // Setup roles
    await accessControl.connect(owner).grantRoleToOrganization(
      await accessControl.MANUFACTURER_ROLE(),
      manufacturer.address
    );
    await accessControl.connect(owner).grantRoleToOrganization(
      await accessControl.LOGISTICS_ROLE(),
      logistics.address
    );
    await accessControl.connect(owner).grantRoleToOrganization(
      await accessControl.RETAILER_ROLE(),
      retailer.address
    );
    await accessControl.connect(owner).grantRoleToOrganization(
      await accessControl.VERIFIER_ROLE(),
      verifier.address
    );
  });

  describe("Product Registration", function () {
    it("Should allow manufacturer to register a product", async function () {
      await traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "A test product for supply chain tracking",
        "Electronics"
      );

      const product = await traceRegistry.products(1);
      expect(product.name).to.equal("Test Product");
      expect(product.description).to.equal("A test product for supply chain tracking");
      expect(product.category).to.equal("Electronics");
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.isActive).to.be.true;
    });

    it("Should emit ProductRegistered event", async function () {
      await expect(traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      )).to.emit(traceRegistry, "ProductRegistered")
        .withArgs(1, "Test Product", manufacturer.address);
    });

    it("Should not allow non-manufacturer to register product", async function () {
      await expect(traceRegistry.connect(logistics).registerProduct(
        "Test Product",
        "Description",
        "Category"
      )).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Batch Creation", function () {
    beforeEach(async function () {
      await traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      );
    });

    it("Should allow manufacturer to create batch", async function () {
      await traceRegistry.connect(manufacturer).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      );

      const batch = await traceRegistry.batches(1);
      expect(batch.productId).to.equal(1);
      expect(batch.batchNumber).to.equal("BATCH001");
      expect(batch.quantity).to.equal(1000);
      expect(batch.manufacturer).to.equal(manufacturer.address);
      expect(batch.isVerified).to.be.false;
    });

    it("Should emit BatchCreated event", async function () {
      await expect(traceRegistry.connect(manufacturer).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      )).to.emit(traceRegistry, "BatchCreated")
        .withArgs(1, 1, "BATCH001");
    });

    it("Should not allow creating batch for non-existent product", async function () {
      await expect(traceRegistry.connect(manufacturer).createBatch(
        999,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      )).to.be.revertedWith("Product not active");
    });

    it("Should not allow non-manufacturer to create batch", async function () {
      await expect(traceRegistry.connect(logistics).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      )).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Trace Records", function () {
    beforeEach(async function () {
      await traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      );
      await traceRegistry.connect(manufacturer).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      );
    });

    it("Should allow adding trace record", async function () {
      await traceRegistry.connect(logistics).addTraceRecord(
        1,
        "Transport",
        "Warehouse A",
        "0xabcdef1234567890",
        "Temperature: 2-8°C"
      );

      const traceRecord = await traceRegistry.traceRecords(1);
      expect(traceRecord.batchId).to.equal(1);
      expect(traceRecord.action).to.equal("Transport");
      expect(traceRecord.location).to.equal("Warehouse A");
      expect(traceRecord.actor).to.equal(logistics.address);
    });

    it("Should emit TraceRecordAdded event", async function () {
      await expect(traceRegistry.connect(logistics).addTraceRecord(
        1,
        "Transport",
        "Warehouse A",
        "0xabcdef1234567890",
        "Temperature: 2-8°C"
      )).to.emit(traceRegistry, "TraceRecordAdded")
        .withArgs(1, 1, logistics.address, "Transport");
    });

    it("Should update batch trace history", async function () {
      await traceRegistry.connect(logistics).addTraceRecord(
        1,
        "Transport",
        "Warehouse A",
        "0xabcdef1234567890",
        "Temperature: 2-8°C"
      );

      const traceHistory = await traceRegistry.getBatchTraceHistory(1);
      expect(traceHistory.length).to.equal(1);
      expect(traceHistory[0]).to.equal(1);
    });

    it("Should update actor traces", async function () {
      await traceRegistry.connect(logistics).addTraceRecord(
        1,
        "Transport",
        "Warehouse A",
        "0xabcdef1234567890",
        "Temperature: 2-8°C"
      );

      const actorTraces = await traceRegistry.getActorTraces(logistics.address);
      expect(actorTraces.length).to.equal(1);
      expect(actorTraces[0]).to.equal(1);
    });
  });

  describe("Batch Verification", function () {
    beforeEach(async function () {
      await traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      );
      await traceRegistry.connect(manufacturer).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      );
    });

    it("Should allow verifier to verify batch", async function () {
      await traceRegistry.connect(verifier).verifyBatch(1, true);

      const batch = await traceRegistry.batches(1);
      expect(batch.isVerified).to.be.true;
    });

    it("Should emit BatchVerified event", async function () {
      await expect(traceRegistry.connect(verifier).verifyBatch(1, true))
        .to.emit(traceRegistry, "BatchVerified")
        .withArgs(1, true);
    });

    it("Should not allow non-verifier to verify batch", async function () {
      await expect(traceRegistry.connect(manufacturer).verifyBatch(1, true))
        .to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow admin to pause contract", async function () {
      await traceRegistry.connect(owner).pause();
      expect(await traceRegistry.paused()).to.be.true;
    });

    it("Should allow admin to unpause contract", async function () {
      await traceRegistry.connect(owner).pause();
      await traceRegistry.connect(owner).unpause();
      expect(await traceRegistry.paused()).to.be.false;
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(traceRegistry.connect(manufacturer).pause())
        .to.be.revertedWith("AccessControl: account");
    });

    it("Should prevent operations when paused", async function () {
      await traceRegistry.connect(owner).pause();
      
      await expect(traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      )).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple products and batches", async function () {
      // Register multiple products
      await traceRegistry.connect(manufacturer).registerProduct("Product 1", "Desc 1", "Cat 1");
      await traceRegistry.connect(manufacturer).registerProduct("Product 2", "Desc 2", "Cat 2");

      // Create batches for each product
      await traceRegistry.connect(manufacturer).createBatch(1, "BATCH001", 100, "hash1");
      await traceRegistry.connect(manufacturer).createBatch(2, "BATCH002", 200, "hash2");

      // Verify counts
      const product1 = await traceRegistry.products(1);
      const product2 = await traceRegistry.products(2);
      const batch1 = await traceRegistry.batches(1);
      const batch2 = await traceRegistry.batches(2);

      expect(product1.name).to.equal("Product 1");
      expect(product2.name).to.equal("Product 2");
      expect(batch1.batchNumber).to.equal("BATCH001");
      expect(batch2.batchNumber).to.equal("BATCH002");
    });

    it("Should handle empty strings gracefully", async function () {
      await traceRegistry.connect(manufacturer).registerProduct("", "", "");
      
      const product = await traceRegistry.products(1);
      expect(product.name).to.equal("");
      expect(product.description).to.equal("");
      expect(product.category).to.equal("");
    });
  });
});
