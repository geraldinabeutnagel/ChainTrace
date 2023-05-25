// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TraceRegistry
 * @dev Core contract for managing supply chain traceability records
 * @author ChainTrace Team
 */
contract TraceRegistry is AccessControl, Pausable {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Counters for unique IDs
    Counters.Counter private _productIdCounter;
    Counters.Counter private _batchIdCounter;
    Counters.Counter private _traceIdCounter;

    // Structs
    struct Product {
        uint256 productId;
        string name;
        string description;
        string category;
        address manufacturer;
        uint256 createdAt;
        bool isActive;
    }

    struct Batch {
        uint256 batchId;
        uint256 productId;
        string batchNumber;
        uint256 quantity;
        uint256 productionDate;
        string rawMaterialsHash;
        address manufacturer;
        bool isVerified;
    }

    struct TraceRecord {
        uint256 traceId;
        uint256 batchId;
        address actor;
        string action;
        string location;
        uint256 timestamp;
        string dataHash;
        string metadata;
    }

    // Mappings
    mapping(uint256 => Product) public products;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => TraceRecord) public traceRecords;
    mapping(uint256 => uint256[]) public batchTraceHistory;
    mapping(address => uint256[]) public actorTraces;

    // Events
    event ProductRegistered(uint256 indexed productId, string name, address manufacturer);
    event BatchCreated(uint256 indexed batchId, uint256 indexed productId, string batchNumber);
    event TraceRecordAdded(uint256 indexed traceId, uint256 indexed batchId, address actor, string action);
    event BatchVerified(uint256 indexed batchId, bool verified);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new product
     * @param name Product name
     * @param description Product description
     * @param category Product category
     */
    function registerProduct(
        string memory name,
        string memory description,
        string memory category
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused {
        _productIdCounter.increment();
        uint256 productId = _productIdCounter.current();

        products[productId] = Product({
            productId: productId,
            name: name,
            description: description,
            category: category,
            manufacturer: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });

        emit ProductRegistered(productId, name, msg.sender);
    }

    /**
     * @dev Create a new product batch
     * @param productId Product ID
     * @param batchNumber Batch number
     * @param quantity Batch quantity
     * @param rawMaterialsHash Hash of raw materials data
     */
    function createBatch(
        uint256 productId,
        string memory batchNumber,
        uint256 quantity,
        string memory rawMaterialsHash
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused {
        require(products[productId].isActive, "Product not active");
        require(products[productId].manufacturer == msg.sender, "Not product manufacturer");

        _batchIdCounter.increment();
        uint256 batchId = _batchIdCounter.current();

        batches[batchId] = Batch({
            batchId: batchId,
            productId: productId,
            batchNumber: batchNumber,
            quantity: quantity,
            productionDate: block.timestamp,
            rawMaterialsHash: rawMaterialsHash,
            manufacturer: msg.sender,
            isVerified: false
        });

        emit BatchCreated(batchId, productId, batchNumber);
    }

    /**
     * @dev Add a trace record for a batch
     * @param batchId Batch ID
     * @param action Action performed
     * @param location Location where action occurred
     * @param dataHash Hash of associated data
     * @param metadata Additional metadata
     */
    function addTraceRecord(
        uint256 batchId,
        string memory action,
        string memory location,
        string memory dataHash,
        string memory metadata
    ) external whenNotPaused {
        require(batches[batchId].batchId != 0, "Batch does not exist");

        _traceIdCounter.increment();
        uint256 traceId = _traceIdCounter.current();

        traceRecords[traceId] = TraceRecord({
            traceId: traceId,
            batchId: batchId,
            actor: msg.sender,
            action: action,
            location: location,
            timestamp: block.timestamp,
            dataHash: dataHash,
            metadata: metadata
        });

        batchTraceHistory[batchId].push(traceId);
        actorTraces[msg.sender].push(traceId);

        emit TraceRecordAdded(traceId, batchId, msg.sender, action);
    }

    /**
     * @dev Verify a batch (only verifiers can call this)
     * @param batchId Batch ID
     * @param verified Verification status
     */
    function verifyBatch(uint256 batchId, bool verified) external onlyRole(VERIFIER_ROLE) {
        require(batches[batchId].batchId != 0, "Batch does not exist");
        batches[batchId].isVerified = verified;
        emit BatchVerified(batchId, verified);
    }

    /**
     * @dev Get trace history for a batch
     * @param batchId Batch ID
     * @return Array of trace IDs
     */
    function getBatchTraceHistory(uint256 batchId) external view returns (uint256[] memory) {
        return batchTraceHistory[batchId];
    }

    /**
     * @dev Get trace records for an actor
     * @param actor Actor address
     * @return Array of trace IDs
     */
    function getActorTraces(address actor) external view returns (uint256[] memory) {
        return actorTraces[actor];
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
