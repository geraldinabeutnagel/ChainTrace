const { ethers } = require("hardhat");

async function main() {
  console.log("Starting contract verification...");

  // Get contract addresses from deployment
  const network = await ethers.provider.getNetwork();
  const deploymentFile = `deployments/${network.name}-${process.env.DEPLOYMENT_TIMESTAMP || 'latest'}.json`;
  
  try {
    const fs = require('fs');
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("Deployment data loaded:", deploymentData);

    // Verify contracts
    const contracts = [
      { name: 'ChainTraceAccessControl', address: deploymentData.contracts.ChainTraceAccessControl },
      { name: 'AuditLog', address: deploymentData.contracts.AuditLog },
      { name: 'ProofVerifier', address: deploymentData.contracts.ProofVerifier },
      { name: 'TraceRegistry', address: deploymentData.contracts.TraceRegistry }
    ];

    for (const contract of contracts) {
      if (contract.address) {
        console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
        
        try {
          await hre.run("verify:verify", {
            address: contract.address,
            constructorArguments: [],
          });
          console.log(`✅ ${contract.name} verified successfully`);
        } catch (error) {
          if (error.message.includes("Already Verified")) {
            console.log(`✅ ${contract.name} already verified`);
          } else {
            console.log(`❌ Failed to verify ${contract.name}:`, error.message);
          }
        }
      } else {
        console.log(`⚠️  No address found for ${contract.name}`);
      }
    }

    console.log("\nContract verification completed!");
  } catch (error) {
    console.error("Error during verification:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
