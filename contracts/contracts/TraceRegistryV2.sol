// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title TraceRegistryV2
 * @dev Enhanced version of TraceRegistry with additional features
 * @author ChainTrace Team
 */
contract TraceRegistryV2 is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    // Role definitions
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Events
    event ProductRegistered(
        bytes32 indexed productId,
        address indexed manufacturer,
        string productName,
        string category,
        uint256 timestamp
    );

    event TraceRecorded(
        bytes32 indexed productId,
        address indexed recorder,
        string location,
        string action,
        uint256 timestamp,
        string metadata
    );

    event ProductTransferred(
        bytes32 indexed productId,
        address indexed from,
        address indexed to,
        string transferType,
        uint256 timestamp
    );

    event QualityCheckPerformed(
        bytes32 indexed productId,
        address indexed checker,
        bool passed,
        string details,
        uint256 timestamp
    );

    event ProductRecalled(
        bytes32 indexed productId,
        address indexed initiator,
        string reason,
        uint256 timestamp
    );

    // Structs
    struct Product {
        bytes32 id;
        address manufacturer;
        string name;
        string category;
        string description;
        uint256 createdAt;
        bool isActive;
        bool isRecalled;
        string recallReason;
    }

    struct TraceRecord {
        bytes32 productId;
        address recorder;
        string location;
        string action;
        uint256 timestamp;
        string metadata;
        bool isValid;
    }

    struct QualityCheck {
        bytes32 productId;
        address checker;
        bool passed;
        string details;
        uint256 timestamp;
        string standards;
    }

    // State variables
    mapping(bytes32 => Product) public products;
    mapping(bytes32 => TraceRecord[]) public productTraces;
    mapping(bytes32 => QualityCheck[]) public qualityChecks;
    mapping(bytes32 => address[]) public productOwners;
    mapping(bytes32 => bool) public productExists;
    
    uint256 public totalProducts;
    uint256 public totalTraces;
    uint256 public version;

    // Modifiers
    modifier onlyValidProduct(bytes32 _productId) {
        require(productExists[_productId], "Product does not exist");
        _;
    }

    modifier onlyActiveProduct(bytes32 _productId) {
        require(productExists[_productId], "Product does not exist");
        require(products[_productId].isActive, "Product is not active");
        require(!products[_productId].isRecalled, "Product has been recalled");
        _;
    }

    /**
     * @dev Initialize the contract
     */
    function initialize() public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        
        version = 2;
    }

    /**
     * @dev Register a new product
     * @param _productId Unique product identifier
     * @param _name Product name
     * @param _category Product category
     * @param _description Product description
     */
    function registerProduct(
        bytes32 _productId,
        string memory _name,
        string memory _category,
        string memory _description
    ) external whenNotPaused nonReentrant {
        require(!productExists[_productId], "Product already exists");
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(bytes(_category).length > 0, "Product category cannot be empty");

        products[_productId] = Product({
            id: _productId,
            manufacturer: msg.sender,
            name: _name,
            category: _category,
            description: _description,
            createdAt: block.timestamp,
            isActive: true,
            isRecalled: false,
            recallReason: ""
        });

        productExists[_productId] = true;
        productOwners[_productId].push(msg.sender);
        totalProducts++;

        emit ProductRegistered(_productId, msg.sender, _name, _category, block.timestamp);
    }

    /**
     * @dev Record a trace event for a product
     * @param _productId Product identifier
     * @param _location Location where the event occurred
     * @param _action Action performed
     * @param _metadata Additional metadata
     */
    function recordTrace(
        bytes32 _productId,
        string memory _location,
        string memory _action,
        string memory _metadata
    ) external whenNotPaused nonReentrant onlyActiveProduct(_productId) {
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(bytes(_action).length > 0, "Action cannot be empty");

        TraceRecord memory newTrace = TraceRecord({
            productId: _productId,
            recorder: msg.sender,
            location: _location,
            action: _action,
            timestamp: block.timestamp,
            metadata: _metadata,
            isValid: true
        });

        productTraces[_productId].push(newTrace);
        totalTraces++;

        emit TraceRecorded(_productId, msg.sender, _location, _action, block.timestamp, _metadata);
    }

    /**
     * @dev Transfer product ownership
     * @param _productId Product identifier
     * @param _to New owner address
     * @param _transferType Type of transfer
     */
    function transferProduct(
        bytes32 _productId,
        address _to,
        string memory _transferType
    ) external whenNotPaused nonReentrant onlyActiveProduct(_productId) {
        require(_to != address(0), "Cannot transfer to zero address");
        require(bytes(_transferType).length > 0, "Transfer type cannot be empty");

        // Check if sender has permission to transfer
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(LOGISTICS_ROLE, msg.sender) ||
            hasRole(RETAILER_ROLE, msg.sender),
            "Insufficient permissions to transfer product"
        );

        productOwners[_productId].push(_to);

        emit ProductTransferred(_productId, msg.sender, _to, _transferType, block.timestamp);
    }

    /**
     * @dev Perform quality check on a product
     * @param _productId Product identifier
     * @param _passed Whether the quality check passed
     * @param _details Quality check details
     * @param _standards Standards used for the check
     */
    function performQualityCheck(
        bytes32 _productId,
        bool _passed,
        string memory _details,
        string memory _standards
    ) external whenNotPaused nonReentrant onlyActiveProduct(_productId) {
        require(bytes(_details).length > 0, "Quality check details cannot be empty");
        require(bytes(_standards).length > 0, "Standards cannot be empty");

        QualityCheck memory newCheck = QualityCheck({
            productId: _productId,
            checker: msg.sender,
            passed: _passed,
            details: _details,
            timestamp: block.timestamp,
            standards: _standards
        });

        qualityChecks[_productId].push(newCheck);

        emit QualityCheckPerformed(_productId, msg.sender, _passed, _details, block.timestamp);
    }

    /**
     * @dev Recall a product
     * @param _productId Product identifier
     * @param _reason Reason for recall
     */
    function recallProduct(
        bytes32 _productId,
        string memory _reason
    ) external whenNotPaused nonReentrant onlyValidProduct(_productId) {
        require(bytes(_reason).length > 0, "Recall reason cannot be empty");
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Insufficient permissions to recall product"
        );

        products[_productId].isRecalled = true;
        products[_productId].recallReason = _reason;

        emit ProductRecalled(_productId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @dev Get product information
     * @param _productId Product identifier
     * @return Product information
     */
    function getProduct(bytes32 _productId) external view returns (Product memory) {
        require(productExists[_productId], "Product does not exist");
        return products[_productId];
    }

    /**
     * @dev Get product trace history
     * @param _productId Product identifier
     * @return Array of trace records
     */
    function getProductTraces(bytes32 _productId) external view returns (TraceRecord[] memory) {
        require(productExists[_productId], "Product does not exist");
        return productTraces[_productId];
    }

    /**
     * @dev Get product quality checks
     * @param _productId Product identifier
     * @return Array of quality checks
     */
    function getProductQualityChecks(bytes32 _productId) external view returns (QualityCheck[] memory) {
        require(productExists[_productId], "Product does not exist");
        return qualityChecks[_productId];
    }

    /**
     * @dev Get product owners
     * @param _productId Product identifier
     * @return Array of owner addresses
     */
    function getProductOwners(bytes32 _productId) external view returns (address[] memory) {
        require(productExists[_productId], "Product does not exist");
        return productOwners[_productId];
    }

    /**
     * @dev Get contract version
     * @return Contract version
     */
    function getVersion() external view returns (uint256) {
        return version;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
