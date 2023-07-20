const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainTrace Integration Tests", function () {
  let accessControl;
  let auditLog;
  let proofVerifier;
  let traceRegistry;
  let owner;
  let manufacturer;
  let logistics;
  let retailer;
  let verifier;
  let auditor;
  let addrs;

  beforeEach(async function () {
    [owner, manufacturer, logistics, retailer, verifier, auditor, ...addrs] = await ethers.getSigners();

    // Deploy all contracts
    const AccessControl = await ethers.getContractFactory("ChainTraceAccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.deployed();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.deployed();

    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    proofVerifier = await ProofVerifier.deploy();
    await proofVerifier.deployed();

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
    await accessControl.connect(owner).grantRoleToOrganization(
      await accessControl.AUDITOR_ROLE(),
      auditor.address
    );
  });

  describe("End-to-End Supply Chain Flow", function () {
    it("Should complete full supply chain traceability flow", async function () {
      // 1. Register organization
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer",
        "San Francisco, CA",
        "contact@acme.com"
      );

      // 2. Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        "Smartphone Model X",
        "Latest smartphone",
        "Electronics"
      );

      // 3. Create batch
      await traceRegistry.connect(manufacturer).createBatch(
        1,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      );

      // 4. Add trace records
      await traceRegistry.connect(manufacturer).addTraceRecord(
        1,
        "Production",
        "Factory A",
        "0xabcdef1234567890",
        "Temperature: 22°C"
      );

      await traceRegistry.connect(logistics).addTraceRecord(
        1,
        "Transport",
        "Warehouse B",
        "0x567890abcdef1234",
        "Vehicle: TRUCK001"
      );

      await traceRegistry.connect(retailer).addTraceRecord(
        1,
        "Retail",
        "Store C",
        "0x901234567890abcd",
        "Shelf: A1"
      );

      // 5. Verify batch
      await traceRegistry.connect(verifier).verifyBatch(1, true);

      // 6. Create audit log
      await auditLog.connect(manufacturer).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Batch Verification",
        "Batch 1",
        "Batch verified successfully",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("verification_data")),
        false
      );

      // 7. Add compliance rule
      await auditLog.connect(auditor).addComplianceRule(
        "FDA_COMPLIANCE",
        "Food and Drug Administration compliance"
      );

      // Verify final state
      const product = await traceRegistry.products(1);
      const batch = await traceRegistry.batches(1);
      const traceHistory = await traceRegistry.getBatchTraceHistory(1);
      const auditEntry = await auditLog.getAuditEntry(1);
      const complianceRule = await auditLog.getComplianceRule("FDA_COMPLIANCE");

      expect(product.name).to.equal("Smartphone Model X");
      expect(batch.batchNumber).to.equal("BATCH001");
      expect(batch.isVerified).to.be.true;
      expect(traceHistory.length).to.equal(3);
      expect(auditEntry.action).to.equal("Batch Verification");
      expect(complianceRule.ruleId).to.equal("FDA_COMPLIANCE");
    });
  });

  describe("Multi-Organization Collaboration", function () {
    it("Should handle multiple organizations working together", async function () {
      // Register multiple organizations
      await accessControl.connect(manufacturer).registerOrganization(
        "Manufacturer A",
        "Product manufacturer",
        "Location A",
        "contact@manufacturer-a.com"
      );

      await accessControl.connect(logistics).registerOrganization(
        "Logistics B",
        "Transport provider",
        "Location B",
        "contact@logistics-b.com"
      );

      await accessControl.connect(retailer).registerOrganization(
        "Retailer C",
        "Retail store",
        "Location C",
        "contact@retailer-c.com"
      );

      // Create products from different manufacturers
      await traceRegistry.connect(manufacturer).registerProduct(
        "Product A",
        "Description A",
        "Category A"
      );

      await traceRegistry.connect(manufacturer).registerProduct(
        "Product B",
        "Description B",
        "Category B"
      );

      // Create batches
      await traceRegistry.connect(manufacturer).createBatch(1, "BATCH_A_001", 500, "0xhash1");
      await traceRegistry.connect(manufacturer).createBatch(2, "BATCH_B_001", 300, "0xhash2");

      // Add traces from different actors
      await traceRegistry.connect(logistics).addTraceRecord(1, "Transport", "Location D", "0xhash3", "Truck 1");
      await traceRegistry.connect(logistics).addTraceRecord(2, "Transport", "Location E", "0xhash4", "Truck 2");

      await traceRegistry.connect(retailer).addTraceRecord(1, "Retail", "Store F", "0xhash5", "Shelf 1");
      await traceRegistry.connect(retailer).addTraceRecord(2, "Retail", "Store G", "0xhash6", "Shelf 2");

      // Verify batches
      await traceRegistry.connect(verifier).verifyBatch(1, true);
      await traceRegistry.connect(verifier).verifyBatch(2, true);

      // Verify final state
      const batch1 = await traceRegistry.batches(1);
      const batch2 = await traceRegistry.batches(2);
      const traceHistory1 = await traceRegistry.getBatchTraceHistory(1);
      const traceHistory2 = await traceRegistry.getBatchTraceHistory(2);

      expect(batch1.batchNumber).to.equal("BATCH_A_001");
      expect(batch2.batchNumber).to.equal("BATCH_B_001");
      expect(batch1.isVerified).to.be.true;
      expect(batch2.isVerified).to.be.true;
      expect(traceHistory1.length).to.equal(2);
      expect(traceHistory2.length).to.equal(2);
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle invalid operations gracefully", async function () {
      // Try to create batch for non-existent product
      await expect(traceRegistry.connect(manufacturer).createBatch(
        999,
        "BATCH001",
        1000,
        "0x1234567890abcdef"
      )).to.be.revertedWith("Product not active");

      // Try to verify batch as non-verifier
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

      await expect(traceRegistry.connect(manufacturer).verifyBatch(1, true))
        .to.be.revertedWith("AccessControl: account");

      // Try to add compliance rule as non-auditor
      await expect(auditLog.connect(manufacturer).addComplianceRule(
        "TEST_RULE",
        "Test description"
      )).to.be.revertedWith("AccessControl: account");
    });

    it("Should handle large numbers of operations", async function () {
      // Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        "Test Product",
        "Description",
        "Category"
      );

      // Create multiple batches
      for (let i = 1; i <= 10; i++) {
        await traceRegistry.connect(manufacturer).createBatch(
          1,
          `BATCH${i.toString().padStart(3, '0')}`,
          100,
          `0x${i.toString().padStart(16, '0')}`
        );
      }

      // Add multiple trace records
      for (let i = 1; i <= 10; i++) {
        await traceRegistry.connect(logistics).addTraceRecord(
          i,
          "Transport",
          `Location ${i}`,
          `0x${(i + 100).toString().padStart(16, '0')}`,
          `Truck ${i}`
        );
      }

      // Verify all batches
      for (let i = 1; i <= 10; i++) {
        await traceRegistry.connect(verifier).verifyBatch(i, true);
      }

      // Verify final state
      for (let i = 1; i <= 10; i++) {
        const batch = await traceRegistry.batches(i);
        expect(batch.batchNumber).to.equal(`BATCH${i.toString().padStart(3, '0')}`);
        expect(batch.isVerified).to.be.true;
      }
    });
  });
});
