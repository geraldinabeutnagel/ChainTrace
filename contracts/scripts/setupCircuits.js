const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Setting up zero-knowledge proof circuits...");

  try {
    // Get the contract
    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    const proofVerifier = await ProofVerifier.deploy();
    await proofVerifier.deployed();

    console.log("ProofVerifier deployed to:", proofVerifier.address);

    // Register default circuits
    const circuits = [
      {
        id: "supply_chain_integrity_v1",
        description: "Supply Chain Integrity Verification Circuit v1.0",
        maxProofAge: 86400, // 24 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("supply_chain_integrity_key"))
      },
      {
        id: "data_authenticity_v1",
        description: "Data Authenticity Verification Circuit v1.0",
        maxProofAge: 43200, // 12 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data_authenticity_key"))
      },
      {
        id: "privacy_preserving_v1",
        description: "Privacy Preserving Verification Circuit v1.0",
        maxProofAge: 86400, // 24 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("privacy_preserving_key"))
      },
      {
        id: "compliance_proof_v1",
        description: "Compliance Proof Verification Circuit v1.0",
        maxProofAge: 172800, // 48 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("compliance_proof_key"))
      },
      {
        id: "quality_assurance_v1",
        description: "Quality Assurance Verification Circuit v1.0",
        maxProofAge: 86400, // 24 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("quality_assurance_key"))
      },
      {
        id: "origin_verification_v1",
        description: "Origin Verification Circuit v1.0",
        maxProofAge: 259200, // 72 hours
        verificationKey: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("origin_verification_key"))
      }
    ];

    // Register each circuit
    for (const circuit of circuits) {
      console.log(`Registering circuit: ${circuit.id}`);
      
      await proofVerifier.registerCircuit(
        circuit.id,
        circuit.description,
        circuit.maxProofAge,
        circuit.verificationKey
      );
      
      console.log(`✅ Circuit ${circuit.id} registered successfully`);
    }

    // Save circuit information
    const circuitInfo = {
      contractAddress: proofVerifier.address,
      circuits: circuits.map(circuit => ({
        id: circuit.id,
        description: circuit.description,
        maxProofAge: circuit.maxProofAge,
        verificationKey: circuit.verificationKey
      })),
      timestamp: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '../circuits', 'circuit-registry.json');
    fs.writeFileSync(outputPath, JSON.stringify(circuitInfo, null, 2));
    
    console.log(`Circuit registry saved to: ${outputPath}`);
    console.log("Circuit setup completed successfully!");

  } catch (error) {
    console.error("Circuit setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
