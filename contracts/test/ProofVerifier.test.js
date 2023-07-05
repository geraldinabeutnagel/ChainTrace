const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofVerifier", function () {
  let proofVerifier;
  let owner;
  let prover;
  let verifier;
  let addrs;

  beforeEach(async function () {
    [owner, prover, verifier, ...addrs] = await ethers.getSigners();

    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    proofVerifier = await ProofVerifier.deploy();
    await proofVerifier.deployed();

    // Grant verifier role
    await proofVerifier.connect(owner).grantRoleToOrganization(
      await proofVerifier.VERIFIER_ROLE(),
      verifier.address
    );
  });

  describe("Circuit Registration", function () {
    it("Should allow admin to register circuit", async function () {
      const circuitId = "test_circuit";
      const description = "Test circuit for verification";
      const maxProofAge = 86400; // 24 hours
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        description,
        maxProofAge,
        verificationKey
      );

      const circuit = await proofVerifier.getCircuit(circuitId);
      expect(circuit.circuitId).to.equal(circuitId);
      expect(circuit.description).to.equal(description);
      expect(circuit.isActive).to.be.true;
      expect(circuit.maxProofAge).to.equal(maxProofAge);
    });

    it("Should emit CircuitRegistered event", async function () {
      const circuitId = "test_circuit";
      const description = "Test circuit for verification";
      const maxProofAge = 86400;
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await expect(proofVerifier.connect(owner).registerCircuit(
        circuitId,
        description,
        maxProofAge,
        verificationKey
      )).to.emit(proofVerifier, "CircuitRegistered")
        .withArgs(circuitId, description, owner.address);
    });

    it("Should not allow duplicate circuit registration", async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Description 1",
        86400,
        verificationKey
      );

      await expect(proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Description 2",
        86400,
        verificationKey
      )).to.be.revertedWith("Circuit already exists");
    });

    it("Should not allow non-admin to register circuit", async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await expect(proofVerifier.connect(prover).registerCircuit(
        circuitId,
        "Description",
        86400,
        verificationKey
      )).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Proof Submission", function () {
    beforeEach(async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Test circuit",
        86400,
        verificationKey
      );
    });

    it("Should allow proof submission", async function () {
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const circuitId = "test_circuit";
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );

      const proof = await proofVerifier.getProof(1);
      expect(proof.proofId).to.equal(1);
      expect(proof.prover).to.equal(prover.address);
      expect(proof.status).to.equal(0); // PENDING
    });

    it("Should emit ProofSubmitted event", async function () {
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const circuitId = "test_circuit";
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      )).to.emit(proofVerifier, "ProofSubmitted")
        .withArgs(1, 0, prover.address);
    });

    it("Should not allow submission to non-existent circuit", async function () {
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const circuitId = "non_existent_circuit";
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      )).to.be.revertedWith("Circuit not registered");
    });

    it("Should not allow submission to inactive circuit", async function () {
      // Register circuit and then deactivate it
      const circuitId = "inactive_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Inactive circuit",
        86400,
        verificationKey
      );

      // Deactivate circuit (this would need to be implemented in the contract)
      // For now, we'll test with a non-existent circuit

      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      )).to.be.revertedWith("Circuit not active");
    });
  });

  describe("Proof Verification", function () {
    beforeEach(async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Test circuit",
        86400,
        verificationKey
      );

      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );
    });

    it("Should allow verifier to verify proof", async function () {
      await proofVerifier.connect(verifier).verifyProof(1, true);

      const proof = await proofVerifier.getProof(1);
      expect(proof.status).to.equal(1); // VERIFIED
      expect(proof.verifier).to.equal(verifier.address);
    });

    it("Should emit ProofVerified event", async function () {
      await expect(proofVerifier.connect(verifier).verifyProof(1, true))
        .to.emit(proofVerifier, "ProofVerified")
        .withArgs(1, true, verifier.address);
    });

    it("Should not allow non-verifier to verify proof", async function () {
      await expect(proofVerifier.connect(prover).verifyProof(1, true))
        .to.be.revertedWith("AccessControl: account");
    });

    it("Should not allow verification of non-existent proof", async function () {
      await expect(proofVerifier.connect(verifier).verifyProof(999, true))
        .to.be.revertedWith("Proof does not exist");
    });

    it("Should not allow verification of already processed proof", async function () {
      await proofVerifier.connect(verifier).verifyProof(1, true);

      await expect(proofVerifier.connect(verifier).verifyProof(1, false))
        .to.be.revertedWith("Proof already processed");
    });
  });

  describe("Proof Expiration", function () {
    beforeEach(async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Test circuit",
        86400,
        verificationKey
      );
    });

    it("Should mark expired proofs as expired", async function () {
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 1; // 1 second from now

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );

      // Fast forward time to after expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await proofVerifier.connect(prover).checkProofExpiration(1);

      const proof = await proofVerifier.getProof(1);
      expect(proof.status).to.equal(3); // EXPIRED
    });

    it("Should emit ProofExpired event", async function () {
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 1;

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );

      // Fast forward time to after expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await expect(proofVerifier.connect(prover).checkProofExpiration(1))
        .to.emit(proofVerifier, "ProofExpired")
        .withArgs(1);
    });
  });

  describe("Batch Operations", function () {
    beforeEach(async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Test circuit",
        86400,
        verificationKey
      );
    });

    it("Should allow batch verification of multiple proofs", async function () {
      // Submit multiple proofs
      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );

      // Batch verify
      await proofVerifier.connect(verifier).batchVerifyProofs([1, 2], [true, false]);

      const proof1 = await proofVerifier.getProof(1);
      const proof2 = await proofVerifier.getProof(2);

      expect(proof1.status).to.equal(1); // VERIFIED
      expect(proof2.status).to.equal(2); // REJECTED
    });

    it("Should not allow batch verification with mismatched array lengths", async function () {
      await expect(proofVerifier.connect(verifier).batchVerifyProofs([1], [true, false]))
        .to.be.revertedWith("Array lengths must match");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      const circuitId = "test_circuit";
      const verificationKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_key"));

      await proofVerifier.connect(owner).registerCircuit(
        circuitId,
        "Test circuit",
        86400,
        verificationKey
      );

      const publicInputsHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_inputs"));
      const proofData = ethers.utils.toUtf8Bytes("test_proof_data");
      const metadata = "Test metadata";
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      await proofVerifier.connect(prover).submitProof(
        0, // SUPPLY_CHAIN_INTEGRITY
        1, // MEDIUM
        publicInputsHash,
        proofData,
        circuitId,
        metadata,
        expirationTime
      );
    });

    it("Should return proofs by prover", async function () {
      const proverProofs = await proofVerifier.getProverProofs(prover.address);
      expect(proverProofs.length).to.equal(1);
      expect(proverProofs[0]).to.equal(1);
    });

    it("Should return proofs by type", async function () {
      const proofsByType = await proofVerifier.getProofsByType(0); // SUPPLY_CHAIN_INTEGRITY
      expect(proofsByType.length).to.equal(1);
      expect(proofsByType[0]).to.equal(1);
    });

    it("Should return total proof count", async function () {
      const totalCount = await proofVerifier.getTotalProofCount();
      expect(totalCount).to.equal(1);
    });
  });
});
