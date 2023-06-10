// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ProofVerifier
 * @dev Zero-knowledge proof verification system for ChainTrace platform
 * @author ChainTrace Team
 */
contract ProofVerifier is AccessControl {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PROVER_ROLE = keccak256("PROVER_ROLE");

    // Counter for proof IDs
    Counters.Counter private _proofIdCounter;

    // Proof types
    enum ProofType {
        SUPPLY_CHAIN_INTEGRITY,
        DATA_AUTHENTICITY,
        PRIVACY_PRESERVING_VERIFICATION,
        COMPLIANCE_PROOF,
        QUALITY_ASSURANCE,
        ORIGIN_VERIFICATION
    }

    // Proof status
    enum ProofStatus {
        PENDING,
        VERIFIED,
        REJECTED,
        EXPIRED
    }

    // Struct for zero-knowledge proofs
    struct ZKProof {
        uint256 proofId;
        ProofType proofType;
        address prover;
        bytes32 publicInputsHash;
        bytes proofData;
        ProofStatus status;
        uint256 createdAt;
        uint256 verifiedAt;
        address verifier;
        string metadata;
        uint256 expirationTime;
    }

    // Struct for verification circuits
    struct VerificationCircuit {
        string circuitId;
        string description;
        bool isActive;
        uint256 maxProofAge;
        address creator;
    }

    // Mappings
    mapping(uint256 => ZKProof) public proofs;
    mapping(string => VerificationCircuit) public circuits;
    mapping(address => uint256[]) public proverProofs;
    mapping(ProofType => uint256[]) public proofsByType;
    mapping(bytes32 => uint256[]) public proofsByInputHash;

    // Circuit verification keys (simplified for demo)
    mapping(string => bytes32) public verificationKeys;

    // Events
    event ProofSubmitted(uint256 indexed proofId, ProofType proofType, address indexed prover);
    event ProofVerified(uint256 indexed proofId, bool verified, address indexed verifier);
    event ProofExpired(uint256 indexed proofId);
    event CircuitRegistered(string indexed circuitId, string description, address creator);
    event VerificationKeyUpdated(string indexed circuitId, bytes32 newKey);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Submit a zero-knowledge proof for verification
     * @param proofType Type of proof
     * @param publicInputsHash Hash of public inputs
     * @param proofData The actual proof data
     * @param circuitId Circuit identifier
     * @param metadata Additional metadata
     * @param expirationTime Proof expiration timestamp
     */
    function submitProof(
        ProofType proofType,
        bytes32 publicInputsHash,
        bytes memory proofData,
        string memory circuitId,
        string memory metadata,
        uint256 expirationTime
    ) external {
        require(bytes(circuits[circuitId].circuitId).length > 0, "Circuit not registered");
        require(circuits[circuitId].isActive, "Circuit not active");
        require(expirationTime > block.timestamp, "Invalid expiration time");

        _proofIdCounter.increment();
        uint256 proofId = _proofIdCounter.current();

        proofs[proofId] = ZKProof({
            proofId: proofId,
            proofType: proofType,
            prover: msg.sender,
            publicInputsHash: publicInputsHash,
            proofData: proofData,
            status: ProofStatus.PENDING,
            createdAt: block.timestamp,
            verifiedAt: 0,
            verifier: address(0),
            metadata: metadata,
            expirationTime: expirationTime
        });

        proverProofs[msg.sender].push(proofId);
        proofsByType[proofType].push(proofId);
        proofsByInputHash[publicInputsHash].push(proofId);

        emit ProofSubmitted(proofId, proofType, msg.sender);
    }

    /**
     * @dev Verify a submitted proof (verifier only)
     * @param proofId Proof ID to verify
     * @param isValid Whether the proof is valid
     */
    function verifyProof(uint256 proofId, bool isValid) external onlyRole(VERIFIER_ROLE) {
        require(proofs[proofId].proofId != 0, "Proof does not exist");
        require(proofs[proofId].status == ProofStatus.PENDING, "Proof already processed");
        require(proofs[proofId].expirationTime > block.timestamp, "Proof expired");

        proofs[proofId].status = isValid ? ProofStatus.VERIFIED : ProofStatus.REJECTED;
        proofs[proofId].verifiedAt = block.timestamp;
        proofs[proofId].verifier = msg.sender;

        emit ProofVerified(proofId, isValid, msg.sender);
    }

    /**
     * @dev Register a new verification circuit (admin only)
     * @param circuitId Circuit identifier
     * @param description Circuit description
     * @param maxProofAge Maximum age for proofs using this circuit
     * @param verificationKey Circuit verification key
     */
    function registerCircuit(
        string memory circuitId,
        string memory description,
        uint256 maxProofAge,
        bytes32 verificationKey
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(circuits[circuitId].circuitId).length == 0, "Circuit already exists");

        circuits[circuitId] = VerificationCircuit({
            circuitId: circuitId,
            description: description,
            isActive: true,
            maxProofAge: maxProofAge,
            creator: msg.sender
        });

        verificationKeys[circuitId] = verificationKey;

        emit CircuitRegistered(circuitId, description, msg.sender);
    }

    /**
     * @dev Update verification key for a circuit (admin only)
     * @param circuitId Circuit identifier
     * @param newKey New verification key
     */
    function updateVerificationKey(
        string memory circuitId,
        bytes32 newKey
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(circuits[circuitId].circuitId).length > 0, "Circuit does not exist");

        verificationKeys[circuitId] = newKey;
        emit VerificationKeyUpdated(circuitId, newKey);
    }

    /**
     * @dev Check if a proof has expired and mark it as expired
     * @param proofId Proof ID to check
     */
    function checkProofExpiration(uint256 proofId) external {
        require(proofs[proofId].proofId != 0, "Proof does not exist");
        
        if (proofs[proofId].expirationTime <= block.timestamp && 
            proofs[proofId].status == ProofStatus.PENDING) {
            proofs[proofId].status = ProofStatus.EXPIRED;
            emit ProofExpired(proofId);
        }
    }

    /**
     * @dev Get proofs submitted by a specific prover
     * @param prover Prover address
     * @return Array of proof IDs
     */
    function getProverProofs(address prover) external view returns (uint256[] memory) {
        return proverProofs[prover];
    }

    /**
     * @dev Get proofs by type
     * @param proofType Proof type
     * @return Array of proof IDs
     */
    function getProofsByType(ProofType proofType) external view returns (uint256[] memory) {
        return proofsByType[proofType];
    }

    /**
     * @dev Get proofs by public inputs hash
     * @param publicInputsHash Public inputs hash
     * @return Array of proof IDs
     */
    function getProofsByInputHash(bytes32 publicInputsHash) external view returns (uint256[] memory) {
        return proofsByInputHash[publicInputsHash];
    }

    /**
     * @dev Get proof details
     * @param proofId Proof ID
     * @return ZK proof struct
     */
    function getProof(uint256 proofId) external view returns (ZKProof memory) {
        return proofs[proofId];
    }

    /**
     * @dev Get circuit details
     * @param circuitId Circuit ID
     * @return Verification circuit struct
     */
    function getCircuit(string memory circuitId) external view returns (VerificationCircuit memory) {
        return circuits[circuitId];
    }

    /**
     * @dev Batch verify multiple proofs (verifier only)
     * @param proofIds Array of proof IDs
     * @param isValidArray Array of validation results
     */
    function batchVerifyProofs(
        uint256[] memory proofIds,
        bool[] memory isValidArray
    ) external onlyRole(VERIFIER_ROLE) {
        require(proofIds.length == isValidArray.length, "Array lengths must match");

        for (uint256 i = 0; i < proofIds.length; i++) {
            verifyProof(proofIds[i], isValidArray[i]);
        }
    }

    /**
     * @dev Get total number of proofs
     * @return Total count
     */
    function getTotalProofCount() external view returns (uint256) {
        return _proofIdCounter.current();
    }

    /**
     * @dev Verify proof using circuit-specific logic (simplified)
     * @param circuitId Circuit identifier
     * @param publicInputs Public inputs
     * @param proofData Proof data
     * @return True if proof is valid
     */
    function verifyProofWithCircuit(
        string memory circuitId,
        bytes32 publicInputs,
        bytes memory proofData
    ) external view returns (bool) {
        require(bytes(circuits[circuitId].circuitId).length > 0, "Circuit not registered");
        require(circuits[circuitId].isActive, "Circuit not active");

        // Simplified verification logic - in production, this would use actual ZK libraries
        bytes32 expectedKey = verificationKeys[circuitId];
        bytes32 computedHash = keccak256(abi.encodePacked(publicInputs, proofData));
        
        return computedHash == expectedKey;
    }
}
