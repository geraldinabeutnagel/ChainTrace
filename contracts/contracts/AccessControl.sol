// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ChainTraceAccessControl
 * @dev Enhanced access control system for ChainTrace platform
 * @author ChainTrace Team
 */
contract ChainTraceAccessControl is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    // Struct for organization details
    struct Organization {
        string name;
        string description;
        string location;
        string contactInfo;
        bool isActive;
        uint256 registrationDate;
        uint256 lastActivity;
    }

    // Struct for permission levels
    struct PermissionLevel {
        bool canRead;
        bool canWrite;
        bool canDelete;
        bool canVerify;
        uint256 expiresAt;
    }

    // Mappings
    mapping(address => Organization) public organizations;
    mapping(address => mapping(bytes32 => PermissionLevel)) public permissions;
    mapping(address => bool) public isRegistered;
    mapping(bytes32 => string) public roleDescriptions;

    // Events
    event OrganizationRegistered(address indexed account, string name, string location);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event PermissionUpdated(address indexed account, bytes32 indexed resource, bool canRead, bool canWrite);
    event OrganizationDeactivated(address indexed account);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize role descriptions
        roleDescriptions[ADMIN_ROLE] = "System Administrator";
        roleDescriptions[MANUFACTURER_ROLE] = "Product Manufacturer";
        roleDescriptions[LOGISTICS_ROLE] = "Logistics Provider";
        roleDescriptions[RETAILER_ROLE] = "Retailer/Distributor";
        roleDescriptions[VERIFIER_ROLE] = "Quality Verifier";
        roleDescriptions[AUDITOR_ROLE] = "System Auditor";
        roleDescriptions[CONSUMER_ROLE] = "End Consumer";
    }

    /**
     * @dev Register a new organization
     * @param name Organization name
     * @param description Organization description
     * @param location Organization location
     * @param contactInfo Contact information
     */
    function registerOrganization(
        string memory name,
        string memory description,
        string memory location,
        string memory contactInfo
    ) external {
        require(!isRegistered[msg.sender], "Organization already registered");
        require(bytes(name).length > 0, "Name cannot be empty");

        organizations[msg.sender] = Organization({
            name: name,
            description: description,
            location: location,
            contactInfo: contactInfo,
            isActive: true,
            registrationDate: block.timestamp,
            lastActivity: block.timestamp
        });

        isRegistered[msg.sender] = true;
        _grantRole(CONSUMER_ROLE, msg.sender);

        emit OrganizationRegistered(msg.sender, name, location);
    }

    /**
     * @dev Grant role to an organization (admin only)
     * @param role Role to grant
     * @param account Account to grant role to
     */
    function grantRoleToOrganization(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        require(isRegistered[account], "Organization not registered");
        require(organizations[account].isActive, "Organization not active");
        
        _grantRole(role, account);
        organizations[account].lastActivity = block.timestamp;
        
        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @dev Revoke role from an organization (admin only)
     * @param role Role to revoke
     * @param account Account to revoke role from
     */
    function revokeRoleFromOrganization(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
        organizations[account].lastActivity = block.timestamp;
        
        emit RoleRevoked(role, account, msg.sender);
    }

    /**
     * @dev Set specific permissions for a resource
     * @param account Account to set permissions for
     * @param resource Resource identifier
     * @param canRead Read permission
     * @param canWrite Write permission
     * @param canDelete Delete permission
     * @param canVerify Verify permission
     * @param expiresAt Expiration timestamp (0 for permanent)
     */
    function setPermissions(
        address account,
        bytes32 resource,
        bool canRead,
        bool canWrite,
        bool canDelete,
        bool canVerify,
        uint256 expiresAt
    ) external onlyRole(ADMIN_ROLE) {
        require(isRegistered[account], "Account not registered");
        
        permissions[account][resource] = PermissionLevel({
            canRead: canRead,
            canWrite: canWrite,
            canDelete: canDelete,
            canVerify: canVerify,
            expiresAt: expiresAt
        });

        emit PermissionUpdated(account, resource, canRead, canWrite);
    }

    /**
     * @dev Check if account has permission for a resource
     * @param account Account to check
     * @param resource Resource identifier
     * @param permissionType Type of permission (0=read, 1=write, 2=delete, 3=verify)
     * @return True if permission is granted
     */
    function hasPermission(
        address account,
        bytes32 resource,
        uint8 permissionType
    ) external view returns (bool) {
        if (!isRegistered[account] || !organizations[account].isActive) {
            return false;
        }

        PermissionLevel memory permission = permissions[account][resource];
        
        // Check if permission has expired
        if (permission.expiresAt > 0 && block.timestamp > permission.expiresAt) {
            return false;
        }

        if (permissionType == 0) return permission.canRead;
        if (permissionType == 1) return permission.canWrite;
        if (permissionType == 2) return permission.canDelete;
        if (permissionType == 3) return permission.canVerify;
        
        return false;
    }

    /**
     * @dev Deactivate an organization
     * @param account Account to deactivate
     */
    function deactivateOrganization(address account) external onlyRole(ADMIN_ROLE) {
        require(isRegistered[account], "Organization not registered");
        
        organizations[account].isActive = false;
        
        // Revoke all roles except CONSUMER_ROLE
        bytes32[] memory roles = new bytes32[](6);
        roles[0] = ADMIN_ROLE;
        roles[1] = MANUFACTURER_ROLE;
        roles[2] = LOGISTICS_ROLE;
        roles[3] = RETAILER_ROLE;
        roles[4] = VERIFIER_ROLE;
        roles[5] = AUDITOR_ROLE;
        
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                _revokeRole(roles[i], account);
            }
        }
        
        emit OrganizationDeactivated(account);
    }

    /**
     * @dev Get organization information
     * @param account Account address
     * @return Organization struct
     */
    function getOrganization(address account) external view returns (Organization memory) {
        return organizations[account];
    }

    /**
     * @dev Get role description
     * @param role Role identifier
     * @return Role description
     */
    function getRoleDescription(bytes32 role) external view returns (string memory) {
        return roleDescriptions[role];
    }

    /**
     * @dev Update organization information
     * @param name New organization name
     * @param description New description
     * @param location New location
     * @param contactInfo New contact information
     */
    function updateOrganizationInfo(
        string memory name,
        string memory description,
        string memory location,
        string memory contactInfo
    ) external {
        require(isRegistered[msg.sender], "Organization not registered");
        require(organizations[msg.sender].isActive, "Organization not active");
        
        organizations[msg.sender].name = name;
        organizations[msg.sender].description = description;
        organizations[msg.sender].location = location;
        organizations[msg.sender].contactInfo = contactInfo;
        organizations[msg.sender].lastActivity = block.timestamp;
    }
}
