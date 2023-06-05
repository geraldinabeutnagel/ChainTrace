// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AuditLog
 * @dev Comprehensive audit logging system for ChainTrace platform
 * @author ChainTrace Team
 */
contract AuditLog is AccessControl {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Counter for log entries
    Counters.Counter private _logIdCounter;

    // Log entry types
    enum LogType {
        SYSTEM_EVENT,
        USER_ACTION,
        CONTRACT_INTERACTION,
        SECURITY_EVENT,
        COMPLIANCE_EVENT,
        DATA_ACCESS,
        ROLE_CHANGE,
        PERMISSION_CHANGE
    }

    // Severity levels
    enum Severity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // Struct for audit log entries
    struct AuditEntry {
        uint256 logId;
        LogType logType;
        Severity severity;
        address actor;
        string action;
        string resource;
        string details;
        uint256 timestamp;
        bytes32 dataHash;
        bool isEncrypted;
    }

    // Struct for compliance requirements
    struct ComplianceRule {
        string ruleId;
        string description;
        bool isActive;
        uint256 createdAt;
        address createdBy;
    }

    // Mappings
    mapping(uint256 => AuditEntry) public auditEntries;
    mapping(string => ComplianceRule) public complianceRules;
    mapping(address => uint256[]) public actorLogs;
    mapping(LogType => uint256[]) public logsByType;
    mapping(Severity => uint256[]) public logsBySeverity;
    mapping(bytes32 => uint256[]) public logsByDataHash;

    // Events
    event AuditLogCreated(
        uint256 indexed logId,
        LogType logType,
        Severity severity,
        address indexed actor,
        string action
    );
    event ComplianceRuleAdded(string indexed ruleId, string description, address createdBy);
    event ComplianceRuleUpdated(string indexed ruleId, bool isActive);
    event SecurityAlertTriggered(uint256 indexed logId, Severity severity, string details);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new audit log entry
     * @param logType Type of log entry
     * @param severity Severity level
     * @param action Action performed
     * @param resource Resource affected
     * @param details Additional details
     * @param dataHash Hash of associated data
     * @param isEncrypted Whether data is encrypted
     */
    function createAuditLog(
        LogType logType,
        Severity severity,
        string memory action,
        string memory resource,
        string memory details,
        bytes32 dataHash,
        bool isEncrypted
    ) external {
        _logIdCounter.increment();
        uint256 logId = _logIdCounter.current();

        auditEntries[logId] = AuditEntry({
            logId: logId,
            logType: logType,
            severity: severity,
            actor: msg.sender,
            action: action,
            resource: resource,
            details: details,
            timestamp: block.timestamp,
            dataHash: dataHash,
            isEncrypted: isEncrypted
        });

        // Update mappings
        actorLogs[msg.sender].push(logId);
        logsByType[logType].push(logId);
        logsBySeverity[severity].push(logId);
        logsByDataHash[dataHash].push(logId);

        emit AuditLogCreated(logId, logType, severity, msg.sender, action);

        // Trigger security alert for high/critical severity
        if (severity == Severity.HIGH || severity == Severity.CRITICAL) {
            emit SecurityAlertTriggered(logId, severity, details);
        }
    }

    /**
     * @dev Add a new compliance rule (auditor only)
     * @param ruleId Unique rule identifier
     * @param description Rule description
     */
    function addComplianceRule(
        string memory ruleId,
        string memory description
    ) external onlyRole(AUDITOR_ROLE) {
        require(bytes(complianceRules[ruleId].ruleId).length == 0, "Rule already exists");

        complianceRules[ruleId] = ComplianceRule({
            ruleId: ruleId,
            description: description,
            isActive: true,
            createdAt: block.timestamp,
            createdBy: msg.sender
        });

        emit ComplianceRuleAdded(ruleId, description, msg.sender);
    }

    /**
     * @dev Update compliance rule status (auditor only)
     * @param ruleId Rule identifier
     * @param isActive New active status
     */
    function updateComplianceRule(
        string memory ruleId,
        bool isActive
    ) external onlyRole(AUDITOR_ROLE) {
        require(bytes(complianceRules[ruleId].ruleId).length > 0, "Rule does not exist");

        complianceRules[ruleId].isActive = isActive;
        emit ComplianceRuleUpdated(ruleId, isActive);
    }

    /**
     * @dev Get audit logs for a specific actor
     * @param actor Actor address
     * @return Array of log IDs
     */
    function getActorLogs(address actor) external view returns (uint256[] memory) {
        return actorLogs[actor];
    }

    /**
     * @dev Get audit logs by type
     * @param logType Log type
     * @return Array of log IDs
     */
    function getLogsByType(LogType logType) external view returns (uint256[] memory) {
        return logsByType[logType];
    }

    /**
     * @dev Get audit logs by severity
     * @param severity Severity level
     * @return Array of log IDs
     */
    function getLogsBySeverity(Severity severity) external view returns (uint256[] memory) {
        return logsBySeverity[severity];
    }

    /**
     * @dev Get audit logs by data hash
     * @param dataHash Data hash
     * @return Array of log IDs
     */
    function getLogsByDataHash(bytes32 dataHash) external view returns (uint256[] memory) {
        return logsByDataHash[dataHash];
    }

    /**
     * @dev Get audit entry details
     * @param logId Log ID
     * @return Audit entry struct
     */
    function getAuditEntry(uint256 logId) external view returns (AuditEntry memory) {
        return auditEntries[logId];
    }

    /**
     * @dev Get compliance rule details
     * @param ruleId Rule ID
     * @return Compliance rule struct
     */
    function getComplianceRule(string memory ruleId) external view returns (ComplianceRule memory) {
        return complianceRules[ruleId];
    }

    /**
     * @dev Search audit logs by time range
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return Array of log IDs within time range
     */
    function searchLogsByTimeRange(
        uint256 startTime,
        uint256 endTime
    ) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](_logIdCounter.current());
        uint256 count = 0;

        for (uint256 i = 1; i <= _logIdCounter.current(); i++) {
            if (auditEntries[i].timestamp >= startTime && auditEntries[i].timestamp <= endTime) {
                result[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * @dev Get total number of audit logs
     * @return Total count
     */
    function getTotalLogCount() external view returns (uint256) {
        return _logIdCounter.current();
    }

    /**
     * @dev Batch create audit logs (admin only)
     * @param logTypes Array of log types
     * @param severities Array of severities
     * @param actions Array of actions
     * @param resources Array of resources
     * @param detailsArray Array of details
     * @param dataHashes Array of data hashes
     * @param encryptedFlags Array of encryption flags
     */
    function batchCreateAuditLogs(
        LogType[] memory logTypes,
        Severity[] memory severities,
        string[] memory actions,
        string[] memory resources,
        string[] memory detailsArray,
        bytes32[] memory dataHashes,
        bool[] memory encryptedFlags
    ) external onlyRole(ADMIN_ROLE) {
        require(
            logTypes.length == severities.length &&
            severities.length == actions.length &&
            actions.length == resources.length &&
            resources.length == detailsArray.length &&
            detailsArray.length == dataHashes.length &&
            dataHashes.length == encryptedFlags.length,
            "Array lengths must match"
        );

        for (uint256 i = 0; i < logTypes.length; i++) {
            createAuditLog(
                logTypes[i],
                severities[i],
                actions[i],
                resources[i],
                detailsArray[i],
                dataHashes[i],
                encryptedFlags[i]
            );
        }
    }
}
