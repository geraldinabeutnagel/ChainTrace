const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Starting contract upgrade process...");

  // Get the contract factory
  const TraceRegistryV2 = await ethers.getContractFactory("TraceRegistryV2");
  
  // Get the proxy address (this should be the address of the deployed proxy)
  const proxyAddress = process.env.PROXY_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  if (proxyAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Please set PROXY_ADDRESS environment variable");
    process.exit(1);
  }

  console.log(`Upgrading TraceRegistry at proxy address: ${proxyAddress}`);

  try {
    // Upgrade the proxy to the new implementation
    const upgraded = await upgrades.upgradeProxy(proxyAddress, TraceRegistryV2);
    
    console.log("Contract upgraded successfully!");
    console.log(`Proxy address: ${proxyAddress}`);
    console.log(`New implementation address: ${await upgrades.erc1967.getImplementationAddress(proxyAddress)}`);
    
    // Verify the upgrade
    const instance = await TraceRegistryV2.attach(proxyAddress);
    const version = await instance.version();
    console.log(`Contract version: ${version}`);
    
  } catch (error) {
    console.error("Upgrade failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
