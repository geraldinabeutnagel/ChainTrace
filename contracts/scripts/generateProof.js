const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Generating zero-knowledge proof...");

  try {
    // Get the contract
    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    const proofVerifier = await ProofVerifier.deploy();
    await proofVerifier.deploy();

    console.log("ProofVerifier deployed to:", proofVerifier.address);

    // Register a test circuit
    const circuitId = "test_circuit";
    const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

    await proofVerifier.registerCircuit(
      circuitId,
      "Test circuit for proof generation",
      86400, // 24 hours
      verificationKey
    );

    console.log(`Circuit ${circuitId} registered successfully`);

    // Generate test proof
    const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
    const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
    const metadata = "Test proof generation";
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const tx = await proofVerifier.submitProof(
      0, // SUPPLY_CHAIN_INTEGRITY
      1, // MEDIUM
      publicInputsHash,
      proofData,
      circuitId,
      metadata,
      expirationTime
    );

    const receipt = await tx.wait();
    console.log("Proof submitted successfully, transaction hash:", tx.hash);

    // Get the proof ID from events
    const event = receipt.events.find(e => e.event === 'ProofSubmitted');
    const proofId = event.args.logId;

    console.log(`Proof generated with ID: ${proofId}`);

    // Save proof information
    const proofInfo = {
      proofId: proofId.toString(),
      circuitId,
      publicInputsHash,
      proofData: proofData.toString(),
      metadata,
      expirationTime,
      transactionHash: tx.hash,
      contractAddress: proofVerifier.address,
      timestamp: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '../proofs', `proof-${proofId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(proofInfo, null, 2));
    
    console.log(`Proof information saved to: ${outputPath}`);
    console.log("Proof generation completed successfully!");

  } catch (error) {
    console.error("Proof generation failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Generation failed:", error);
    process.exit(1);
  });
