const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainTrace Integration Tests", function () {
  let traceRegistry;
  let accessControl;
  let auditLog;
  let proofVerifier;
  let owner;
  let manufacturer;
  let logistics;
  let retailer;
  let auditor;

  beforeEach(async function () {
    [owner, manufacturer, logistics, retailer, auditor] = await ethers.getSigners();

    // Deploy contracts
    const TraceRegistry = await ethers.getContractFactory("TraceRegistry");
    traceRegistry = await TraceRegistry.deploy();
    await traceRegistry.deployed();

    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.deployed();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.deployed();

    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    proofVerifier = await ProofVerifier.deploy();
    await proofVerifier.deployed();

    // Setup roles
    await accessControl.grantRole(await accessControl.MANUFACTURER_ROLE(), manufacturer.address);
    await accessControl.grantRole(await accessControl.LOGISTICS_ROLE(), logistics.address);
    await accessControl.grantRole(await accessControl.RETAILER_ROLE(), retailer.address);
    await accessControl.grantRole(await accessControl.AUDITOR_ROLE(), auditor.address);
  });

  describe("Complete Supply Chain Flow", function () {
    it("Should handle complete product lifecycle", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TEST_PRODUCT_001"));
      
      // 1. Manufacturer registers product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Test Product",
        "Electronics",
        "A test product for integration testing"
      );

      // Verify product registration
      const product = await traceRegistry.getProduct(productId);
      expect(product.name).to.equal("Test Product");
      expect(product.manufacturer).to.equal(manufacturer.address);

      // 2. Record manufacturing trace
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Manufacturing Facility A",
        "Production Complete",
        "Product manufactured and quality checked"
      );

      // 3. Logistics takes over
      await traceRegistry.connect(logistics).recordTrace(
        productId,
        "Warehouse B",
        "Received for Shipping",
        "Product received and prepared for shipment"
      );

      // 4. Record shipping trace
      await traceRegistry.connect(logistics).recordTrace(
        productId,
        "In Transit",
        "Shipped",
        "Product shipped to destination"
      );

      // 5. Retailer receives product
      await traceRegistry.connect(retailer).recordTrace(
        productId,
        "Retail Store C",
        "Received",
        "Product received at retail location"
      );

      // 6. Auditor performs audit
      await auditLog.connect(auditor).logEvent(
        productId,
        "AUDIT_COMPLETE",
        "Supply chain audit completed successfully",
        "All trace records verified"
      );

      // Verify complete trace history
      const traces = await traceRegistry.getProductHistory(productId);
      expect(traces.length).to.equal(4); // 4 trace records

      // Verify audit log
      const auditEvents = await auditLog.getAuditEvents(productId);
      expect(auditEvents.length).to.equal(1);
    });

    it("Should handle product recall scenario", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RECALL_PRODUCT_001"));
      
      // Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Recall Test Product",
        "Food",
        "A product that will be recalled"
      );

      // Record some traces
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Manufacturing Facility",
        "Production Complete",
        "Product manufactured"
      );

      // Simulate recall
      await auditLog.connect(auditor).logEvent(
        productId,
        "RECALL_INITIATED",
        "Product recall initiated due to safety concerns",
        "Safety issue detected in batch"
      );

      // Verify recall event
      const auditEvents = await auditLog.getAuditEvents(productId);
      expect(auditEvents.length).to.equal(1);
      expect(auditEvents[0].eventType).to.equal("RECALL_INITIATED");
    });

    it("Should handle access control properly", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ACCESS_TEST_001"));
      
      // Manufacturer can register product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Access Test Product",
        "Test",
        "Testing access control"
      );

      // Non-authorized user should not be able to record trace
      await expect(
        traceRegistry.connect(owner).recordTrace(
          productId,
          "Unauthorized Location",
          "Unauthorized Action",
          "This should fail"
        )
      ).to.be.revertedWith("Caller does not have required role");

      // Authorized user should be able to record trace
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Authorized Location",
        "Authorized Action",
        "This should succeed"
      );

      // Verify trace was recorded
      const traces = await traceRegistry.getProductHistory(productId);
      expect(traces.length).to.equal(1);
    });
  });

  describe("Cross-Contract Interactions", function () {
    it("Should integrate trace registry with audit log", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CROSS_CONTRACT_001"));
      
      // Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Cross Contract Product",
        "Test",
        "Testing cross-contract integration"
      );

      // Record trace
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Test Location",
        "Test Action",
        "Test metadata"
      );

      // Log audit event
      await auditLog.connect(auditor).logEvent(
        productId,
        "TRACE_VERIFIED",
        "Trace record verified by auditor",
        "All trace data validated"
      );

      // Verify both contracts have the data
      const traces = await traceRegistry.getProductHistory(productId);
      const auditEvents = await auditLog.getAuditEvents(productId);
      
      expect(traces.length).to.equal(1);
      expect(auditEvents.length).to.equal(1);
    });

    it("Should handle proof verification integration", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROOF_TEST_001"));
      
      // Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Proof Test Product",
        "Test",
        "Testing proof verification"
      );

      // Record trace
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Proof Location",
        "Proof Action",
        "Proof metadata"
      );

      // Simulate proof verification (placeholder)
      // In a real implementation, this would verify ZK proofs
      const proofData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROOF_DATA"));
      
      // Log proof verification event
      await auditLog.connect(auditor).logEvent(
        productId,
        "PROOF_VERIFIED",
        "Zero-knowledge proof verified",
        "Proof data: " + proofData
      );

      // Verify audit event
      const auditEvents = await auditLog.getAuditEvents(productId);
      expect(auditEvents.length).to.equal(1);
      expect(auditEvents[0].eventType).to.equal("PROOF_VERIFIED");
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle non-existent product queries", async function () {
      const nonExistentProductId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NON_EXISTENT"));
      
      // Querying non-existent product should return empty arrays
      const traces = await traceRegistry.getProductHistory(nonExistentProductId);
      expect(traces.length).to.equal(0);
    });

    it("Should handle duplicate product registration", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DUPLICATE_TEST_001"));
      
      // First registration should succeed
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Duplicate Test Product",
        "Test",
        "Testing duplicate registration"
      );

      // Second registration should fail
      await expect(
        traceRegistry.connect(manufacturer).registerProduct(
          productId,
          "Duplicate Test Product 2",
          "Test",
          "This should fail"
        )
      ).to.be.revertedWith("Product already exists");
    });

    it("Should handle empty trace metadata", async function () {
      const productId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMPTY_METADATA_001"));
      
      // Register product
      await traceRegistry.connect(manufacturer).registerProduct(
        productId,
        "Empty Metadata Product",
        "Test",
        "Testing empty metadata"
      );

      // Record trace with empty metadata
      await traceRegistry.connect(manufacturer).recordTrace(
        productId,
        "Test Location",
        "Test Action",
        "" // Empty metadata
      );

      // Verify trace was recorded
      const traces = await traceRegistry.getProductHistory(productId);
      expect(traces.length).to.equal(1);
      expect(traces[0].metadata).to.equal("");
    });
  });
});