const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLog", function () {
  let auditLog;
  let owner;
  let auditor;
  let user;
  let addrs;

  beforeEach(async function () {
    [owner, auditor, user, ...addrs] = await ethers.getSigners();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.deployed();

    // Grant auditor role
    await auditLog.connect(owner).grantRoleToOrganization(
      await auditLog.AUDITOR_ROLE(),
      auditor.address
    );
  });

  describe("Audit Log Creation", function () {
    it("Should allow anyone to create audit log", async function () {
      await auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Test Action",
        "Test Resource",
        "Test Details",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_data")),
        false
      );

      const log = await auditLog.getAuditEntry(1);
      expect(log.logId).to.equal(1);
      expect(log.logType).to.equal(0); // SYSTEM_EVENT
      expect(log.severity).to.equal(1); // MEDIUM
      expect(log.action).to.equal("Test Action");
      expect(log.actor).to.equal(user.address);
    });

    it("Should emit AuditLogCreated event", async function () {
      await expect(auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Test Action",
        "Test Resource",
        "Test Details",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_data")),
        false
      )).to.emit(auditLog, "AuditLogCreated")
        .withArgs(1, 0, 1, user.address, "Test Action");
    });

    it("Should trigger security alert for high severity", async function () {
      await expect(auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        2, // HIGH
        "Security Breach",
        "System",
        "Unauthorized access detected",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("security_data")),
        false
      )).to.emit(auditLog, "SecurityAlertTriggered")
        .withArgs(1, 2, "Unauthorized access detected");
    });
  });

  describe("Compliance Rules", function () {
    it("Should allow auditor to add compliance rule", async function () {
      await auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "General Data Protection Regulation compliance requirements"
      );

      const rule = await auditLog.getComplianceRule("GDPR_COMPLIANCE");
      expect(rule.ruleId).to.equal("GDPR_COMPLIANCE");
      expect(rule.description).to.equal("General Data Protection Regulation compliance requirements");
      expect(rule.isActive).to.be.true;
    });

    it("Should emit ComplianceRuleAdded event", async function () {
      await expect(auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "General Data Protection Regulation compliance requirements"
      )).to.emit(auditLog, "ComplianceRuleAdded")
        .withArgs("GDPR_COMPLIANCE", "General Data Protection Regulation compliance requirements", auditor.address);
    });

    it("Should not allow duplicate compliance rule", async function () {
      await auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "Description 1"
      );

      await expect(auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "Description 2"
      )).to.be.revertedWith("Rule already exists");
    });

    it("Should not allow non-auditor to add compliance rule", async function () {
      await expect(auditLog.connect(user).addComplianceRule(
        "GDPR_COMPLIANCE",
        "Description"
      )).to.be.revertedWith("AccessControl: account");
    });

    it("Should allow auditor to update compliance rule", async function () {
      await auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "Description"
      );

      await auditLog.connect(auditor).updateComplianceRule("GDPR_COMPLIANCE", false);

      const rule = await auditLog.getComplianceRule("GDPR_COMPLIANCE");
      expect(rule.isActive).to.be.false;
    });

    it("Should emit ComplianceRuleUpdated event", async function () {
      await auditLog.connect(auditor).addComplianceRule(
        "GDPR_COMPLIANCE",
        "Description"
      );

      await expect(auditLog.connect(auditor).updateComplianceRule("GDPR_COMPLIANCE", false))
        .to.emit(auditLog, "ComplianceRuleUpdated")
        .withArgs("GDPR_COMPLIANCE", false);
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Create some test logs
      await auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Action 1",
        "Resource 1",
        "Details 1",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1")),
        false
      );

      await auditLog.connect(user).createAuditLog(
        1, // USER_ACTION
        2, // HIGH
        "Action 2",
        "Resource 2",
        "Details 2",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data2")),
        false
      );
    });

    it("Should return logs by actor", async function () {
      const actorLogs = await auditLog.getActorLogs(user.address);
      expect(actorLogs.length).to.equal(2);
      expect(actorLogs[0]).to.equal(1);
      expect(actorLogs[1]).to.equal(2);
    });

    it("Should return logs by type", async function () {
      const systemLogs = await auditLog.getLogsByType(0); // SYSTEM_EVENT
      expect(systemLogs.length).to.equal(1);
      expect(systemLogs[0]).to.equal(1);

      const userLogs = await auditLog.getLogsByType(1); // USER_ACTION
      expect(userLogs.length).to.equal(1);
      expect(userLogs[0]).to.equal(2);
    });

    it("Should return logs by severity", async function () {
      const mediumLogs = await auditLog.getLogsBySeverity(1); // MEDIUM
      expect(mediumLogs.length).to.equal(1);
      expect(mediumLogs[0]).to.equal(1);

      const highLogs = await auditLog.getLogsBySeverity(2); // HIGH
      expect(highLogs.length).to.equal(1);
      expect(highLogs[0]).to.equal(2);
    });

    it("Should return logs by data hash", async function () {
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1"));
      const logsByHash = await auditLog.getLogsByDataHash(dataHash);
      expect(logsByHash.length).to.equal(1);
      expect(logsByHash[0]).to.equal(1);
    });

    it("Should return total log count", async function () {
      const totalCount = await auditLog.getTotalLogCount();
      expect(totalCount).to.equal(2);
    });
  });

  describe("Time Range Search", function () {
    beforeEach(async function () {
      // Create logs at different times
      await auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Action 1",
        "Resource 1",
        "Details 1",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1")),
        false
      );

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine", []);

      await auditLog.connect(user).createAuditLog(
        0, // SYSTEM_EVENT
        1, // MEDIUM
        "Action 2",
        "Resource 2",
        "Details 2",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data2")),
        false
      );
    });

    it("Should return logs within time range", async function () {
      const startTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const logsInRange = await auditLog.searchLogsByTimeRange(startTime, endTime);
      expect(logsInRange.length).to.equal(2);
    });
  });

  describe("Batch Operations", function () {
    it("Should allow admin to batch create audit logs", async function () {
      const logTypes = [0, 1]; // SYSTEM_EVENT, USER_ACTION
      const severities = [1, 2]; // MEDIUM, HIGH
      const actions = ["Action 1", "Action 2"];
      const resources = ["Resource 1", "Resource 2"];
      const detailsArray = ["Details 1", "Details 2"];
      const dataHashes = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data2"))
      ];
      const encryptedFlags = [false, false];

      await auditLog.connect(owner).batchCreateAuditLogs(
        logTypes,
        severities,
        actions,
        resources,
        detailsArray,
        dataHashes,
        encryptedFlags
      );

      const totalCount = await auditLog.getTotalLogCount();
      expect(totalCount).to.equal(2);
    });

    it("Should not allow batch creation with mismatched array lengths", async function () {
      const logTypes = [0, 1];
      const severities = [1]; // Mismatched length
      const actions = ["Action 1", "Action 2"];
      const resources = ["Resource 1", "Resource 2"];
      const detailsArray = ["Details 1", "Details 2"];
      const dataHashes = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data2"))
      ];
      const encryptedFlags = [false, false];

      await expect(auditLog.connect(owner).batchCreateAuditLogs(
        logTypes,
        severities,
        actions,
        resources,
        detailsArray,
        dataHashes,
        encryptedFlags
      )).to.be.revertedWith("Array lengths must match");
    });
  });
});
