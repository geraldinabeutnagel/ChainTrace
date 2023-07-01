const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainTraceAccessControl", function () {
  let accessControl;
  let owner;
  let manufacturer;
  let logistics;
  let retailer;
  let verifier;
  let auditor;
  let consumer;
  let addrs;

  beforeEach(async function () {
    [owner, manufacturer, logistics, retailer, verifier, auditor, consumer, ...addrs] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("ChainTraceAccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.deployed();
  });

  describe("Organization Registration", function () {
    it("Should allow anyone to register as an organization", async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      );

      const org = await accessControl.getOrganization(manufacturer.address);
      expect(org.name).to.equal("Acme Manufacturing");
      expect(org.description).to.equal("Leading manufacturer of electronics");
      expect(org.location).to.equal("San Francisco, CA");
      expect(org.contactInfo).to.equal("contact@acme.com");
      expect(org.isActive).to.be.true;
    });

    it("Should emit OrganizationRegistered event", async function () {
      await expect(accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      )).to.emit(accessControl, "OrganizationRegistered")
        .withArgs(manufacturer.address, "Acme Manufacturing", "San Francisco, CA");
    });

    it("Should not allow duplicate organization registration", async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      );

      await expect(accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing 2",
        "Another description",
        "New York, NY",
        "contact2@acme.com"
      )).to.be.revertedWith("Organization already registered");
    });

    it("Should not allow empty organization name", async function () {
      await expect(accessControl.connect(manufacturer).registerOrganization(
        "",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      )).to.be.revertedWith("Name cannot be empty");
    });
  });

  describe("Role Management", function () {
    beforeEach(async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      );
    });

    it("Should allow admin to grant roles", async function () {
      await accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      );

      expect(await accessControl.hasRole(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.be.true;
    });

    it("Should emit RoleGranted event", async function () {
      await expect(accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.emit(accessControl, "RoleGranted")
        .withArgs(await accessControl.MANUFACTURER_ROLE(), manufacturer.address, owner.address);
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(accessControl.connect(manufacturer).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.be.revertedWith("AccessControl: account");
    });

    it("Should not allow granting role to unregistered organization", async function () {
      await expect(accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        logistics.address
      )).to.be.revertedWith("Organization not registered");
    });

    it("Should allow admin to revoke roles", async function () {
      await accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      );

      await accessControl.connect(owner).revokeRoleFromOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      );

      expect(await accessControl.hasRole(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.be.false;
    });

    it("Should emit RoleRevoked event", async function () {
      await accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      );

      await expect(accessControl.connect(owner).revokeRoleFromOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.emit(accessControl, "RoleRevoked")
        .withArgs(await accessControl.MANUFACTURER_ROLE(), manufacturer.address, owner.address);
    });
  });

  describe("Permission Management", function () {
    beforeEach(async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      );
    });

    it("Should allow admin to set permissions", async function () {
      const resource = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("product_data"));
      
      await accessControl.connect(owner).setPermissions(
        manufacturer.address,
        resource,
        true, // canRead
        true, // canWrite
        false, // canDelete
        false, // canVerify
        0 // expiresAt (permanent)
      );

      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        0 // read permission
      )).to.be.true;

      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        1 // write permission
      )).to.be.true;

      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        2 // delete permission
      )).to.be.false;
    });

    it("Should emit PermissionUpdated event", async function () {
      const resource = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("product_data"));
      
      await expect(accessControl.connect(owner).setPermissions(
        manufacturer.address,
        resource,
        true,
        true,
        false,
        false,
        0
      )).to.emit(accessControl, "PermissionUpdated")
        .withArgs(manufacturer.address, resource, true, true);
    });

    it("Should handle permission expiration", async function () {
      const resource = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("product_data"));
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await accessControl.connect(owner).setPermissions(
        manufacturer.address,
        resource,
        true,
        true,
        false,
        false,
        expirationTime
      );

      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        0 // read permission
      )).to.be.true;

      // Fast forward time to after expiration
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        0 // read permission
      )).to.be.false;
    });
  });

  describe("Organization Management", function () {
    beforeEach(async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Acme Manufacturing",
        "Leading manufacturer of electronics",
        "San Francisco, CA",
        "contact@acme.com"
      );

      await accessControl.connect(owner).grantRoleToOrganization(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      );
    });

    it("Should allow admin to deactivate organization", async function () {
      await accessControl.connect(owner).deactivateOrganization(manufacturer.address);

      const org = await accessControl.getOrganization(manufacturer.address);
      expect(org.isActive).to.be.false;

      expect(await accessControl.hasRole(
        await accessControl.MANUFACTURER_ROLE(),
        manufacturer.address
      )).to.be.false;
    });

    it("Should emit OrganizationDeactivated event", async function () {
      await expect(accessControl.connect(owner).deactivateOrganization(manufacturer.address))
        .to.emit(accessControl, "OrganizationDeactivated")
        .withArgs(manufacturer.address);
    });

    it("Should allow organization to update its information", async function () {
      await accessControl.connect(manufacturer).updateOrganizationInfo(
        "Acme Manufacturing Updated",
        "Updated description",
        "New York, NY",
        "newcontact@acme.com"
      );

      const org = await accessControl.getOrganization(manufacturer.address);
      expect(org.name).to.equal("Acme Manufacturing Updated");
      expect(org.description).to.equal("Updated description");
      expect(org.location).to.equal("New York, NY");
      expect(org.contactInfo).to.equal("newcontact@acme.com");
    });

    it("Should not allow non-registered organization to update info", async function () {
      await expect(accessControl.connect(logistics).updateOrganizationInfo(
        "Logistics Corp",
        "Description",
        "Location",
        "contact@logistics.com"
      )).to.be.revertedWith("Organization not registered");
    });

    it("Should not allow inactive organization to update info", async function () {
      await accessControl.connect(owner).deactivateOrganization(manufacturer.address);

      await expect(accessControl.connect(manufacturer).updateOrganizationInfo(
        "Updated Name",
        "Description",
        "Location",
        "contact@acme.com"
      )).to.be.revertedWith("Organization not active");
    });
  });

  describe("Role Descriptions", function () {
    it("Should return correct role descriptions", async function () {
      expect(await accessControl.getRoleDescription(await accessControl.ADMIN_ROLE()))
        .to.equal("System Administrator");
      
      expect(await accessControl.getRoleDescription(await accessControl.MANUFACTURER_ROLE()))
        .to.equal("Product Manufacturer");
      
      expect(await accessControl.getRoleDescription(await accessControl.LOGISTICS_ROLE()))
        .to.equal("Logistics Provider");
      
      expect(await accessControl.getRoleDescription(await accessControl.RETAILER_ROLE()))
        .to.equal("Retailer/Distributor");
      
      expect(await accessControl.getRoleDescription(await accessControl.VERIFIER_ROLE()))
        .to.equal("Quality Verifier");
      
      expect(await accessControl.getRoleDescription(await accessControl.AUDITOR_ROLE()))
        .to.equal("System Auditor");
      
      expect(await accessControl.getRoleDescription(await accessControl.CONSUMER_ROLE()))
        .to.equal("End Consumer");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple organizations", async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Manufacturer 1",
        "Description 1",
        "Location 1",
        "contact1@example.com"
      );

      await accessControl.connect(logistics).registerOrganization(
        "Logistics 1",
        "Description 2",
        "Location 2",
        "contact2@example.com"
      );

      await accessControl.connect(retailer).registerOrganization(
        "Retailer 1",
        "Description 3",
        "Location 3",
        "contact3@example.com"
      );

      const org1 = await accessControl.getOrganization(manufacturer.address);
      const org2 = await accessControl.getOrganization(logistics.address);
      const org3 = await accessControl.getOrganization(retailer.address);

      expect(org1.name).to.equal("Manufacturer 1");
      expect(org2.name).to.equal("Logistics 1");
      expect(org3.name).to.equal("Retailer 1");
    });

    it("Should handle permission checks for non-existent resources", async function () {
      const nonExistentResource = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("non_existent"));
      
      expect(await accessControl.hasPermission(
        manufacturer.address,
        nonExistentResource,
        0 // read permission
      )).to.be.false;
    });

    it("Should handle permission checks for inactive organizations", async function () {
      await accessControl.connect(manufacturer).registerOrganization(
        "Test Org",
        "Description",
        "Location",
        "contact@test.com"
      );

      const resource = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_resource"));
      
      await accessControl.connect(owner).setPermissions(
        manufacturer.address,
        resource,
        true,
        true,
        false,
        false,
        0
      );

      // Deactivate organization
      await accessControl.connect(owner).deactivateOrganization(manufacturer.address);

      // Permission should be false for inactive organization
      expect(await accessControl.hasPermission(
        manufacturer.address,
        resource,
        0 // read permission
      )).to.be.false;
    });
  });
});
