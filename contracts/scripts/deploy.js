const { ethers } = require("hardhat");

async function main() {
  console.log("Starting ChainTrace contracts deployment...");

  // Get the contract factories
  const TraceRegistry = await ethers.getContractFactory("TraceRegistry");
  const ChainTraceAccessControl = await ethers.getContractFactory("ChainTraceAccessControl");
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const ProofVerifier = await ethers.getContractFactory("ProofVerifier");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy contracts
  console.log("\n1. Deploying ChainTraceAccessControl...");
  const accessControl = await ChainTraceAccessControl.deploy();
  await accessControl.deployed();
  console.log("ChainTraceAccessControl deployed to:", accessControl.address);

  console.log("\n2. Deploying AuditLog...");
  const auditLog = await AuditLog.deploy();
  await auditLog.deployed();
  console.log("AuditLog deployed to:", auditLog.address);

  console.log("\n3. Deploying ProofVerifier...");
  const proofVerifier = await ProofVerifier.deploy();
  await proofVerifier.deployed();
  console.log("ProofVerifier deployed to:", proofVerifier.address);

  console.log("\n4. Deploying TraceRegistry...");
  const traceRegistry = await TraceRegistry.deploy();
  await traceRegistry.deployed();
  console.log("TraceRegistry deployed to:", traceRegistry.address);

  // Setup initial roles and configurations
  console.log("\n5. Setting up initial configurations...");
  
  // Grant admin role to TraceRegistry
  await accessControl.grantRoleToOrganization(
    await accessControl.ADMIN_ROLE(),
    traceRegistry.address
  );
  console.log("Granted admin role to TraceRegistry");

  // Register initial verification circuits
  const circuitId = "supply_chain_integrity_v1";
  const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("initial_key"));
  
  await proofVerifier.registerCircuit(
    circuitId,
    "Supply Chain Integrity Verification Circuit v1.0",
    86400, // 24 hours max proof age
    verificationKey
  );
  console.log("Registered initial verification circuit:", circuitId);

  // Create initial compliance rules
  await auditLog.addComplianceRule(
    "FDA_COMPLIANCE",
    "Food and Drug Administration compliance requirements"
  );
  await auditLog.addComplianceRule(
    "ISO_9001",
    "ISO 9001 Quality Management System requirements"
  );
  await auditLog.addComplianceRule(
    "GDPR_COMPLIANCE",
    "General Data Protection Regulation compliance"
  );
  console.log("Added initial compliance rules");

  // Log deployment completion
  await auditLog.createAuditLog(
    0, // SYSTEM_EVENT
    1, // MEDIUM
    "Contract Deployment",
    "System",
    `ChainTrace contracts deployed successfully. AccessControl: ${accessControl.address}, AuditLog: ${auditLog.address}, ProofVerifier: ${proofVerifier.address}, TraceRegistry: ${traceRegistry.address}`,
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("deployment_complete")),
    false
  );

  console.log("\n=== Deployment Summary ===");
  console.log("ChainTraceAccessControl:", accessControl.address);
  console.log("AuditLog:", auditLog.address);
  console.log("ProofVerifier:", proofVerifier.address);
  console.log("TraceRegistry:", traceRegistry.address);
  console.log("Deployer:", deployer.address);
  console.log("Network:", await ethers.provider.getNetwork());
  console.log("Block Number:", await ethers.provider.getBlockNumber());

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ChainTraceAccessControl: accessControl.address,
      AuditLog: auditLog.address,
      ProofVerifier: proofVerifier.address,
      TraceRegistry: traceRegistry.address
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployments/${(await ethers.provider.getNetwork()).name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
