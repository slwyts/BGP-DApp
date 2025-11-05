import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying BelaChain DApp contracts...\n");

  const deployer = (await ethers.getSigners())[0];
  console.log("Deployer address:", deployer.address);

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const finalOwner = process.env.FINAL_OWNER_ADDRESS || deployer.address;

  console.log("Treasury address:", treasury);
  console.log("Final owner address:", finalOwner);

  // 1. Deploy BGPToken
  console.log("\n=== Deploying BGPToken ===");
  const BGPToken = await ethers.getContractFactory("BGPToken");
  const bgpToken = await BGPToken.deploy();
  await bgpToken.waitForDeployment();
  const bgpTokenAddress = await bgpToken.getAddress();
  console.log("BGPToken deployed at:", bgpTokenAddress);

  // 2. Deploy MockUSDT
  console.log("\n=== Deploying MockUSDT ===");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdtToken = await MockUSDT.deploy();
  await usdtToken.waitForDeployment();
  const usdtTokenAddress = await usdtToken.getAddress();
  console.log("MockUSDT deployed at:", usdtTokenAddress);

  // Mint test USDT
  const mintTx = await usdtToken.mint(
    deployer.address,
    ethers.parseUnits("1000000", 6)
  );
  await mintTx.wait();
  console.log("Minted 1,000,000 USDT to deployer");

  // 3. Deploy BelaChainDApp
  console.log("\n=== Deploying BelaChainDApp ===");
  const BelaChainDApp = await ethers.getContractFactory("BelaChainDApp");
  const dapp = await BelaChainDApp.deploy(
    bgpTokenAddress,
    usdtTokenAddress,
    treasury
  );
  await dapp.waitForDeployment();
  const dappAddress = await dapp.getAddress();
  console.log("BelaChainDApp deployed at:", dappAddress);

  // Transfer USDT to DApp
  const transferTx = await usdtToken.transfer(
    dappAddress,
    ethers.parseUnits("500000", 6)
  );
  await transferTx.wait();
  console.log("Transferred 500,000 USDT to BelaChainDApp");

  // 4. Set up permissions
  console.log("\n=== Setting up permissions ===");
  const setMinterTx = await bgpToken.setMinter(dappAddress, true);
  await setMinterTx.wait();
  console.log("Granted minter role to BelaChainDApp");

  const setCheckerTx = await bgpToken.setBlacklistChecker(dappAddress);
  await setCheckerTx.wait();
  console.log("Set blacklist checker to BelaChainDApp");

  // 5. Transfer ownership
  const transferBgpOwnershipTx = await bgpToken.transferOwnership(finalOwner);
  await transferBgpOwnershipTx.wait();
  console.log("Transferred BGPToken ownership to:", finalOwner);

  const transferDappOwnershipTx = await dapp.transferOwnership(finalOwner);
  await transferDappOwnershipTx.wait();
  console.log("Transferred BelaChainDApp ownership to:", finalOwner);

  const transferUsdtOwnershipTx = await usdtToken.transferOwnership(finalOwner);
  await transferUsdtOwnershipTx.wait();
  console.log("Transferred MockUSDT ownership to:", finalOwner);

  // 6. Output summary
  console.log("\n=== Deployment Summary ===");
  console.log("BGPToken:", bgpTokenAddress);
  console.log("MockUSDT:", usdtTokenAddress);
  console.log("BelaChainDApp:", dappAddress);
  console.log("Treasury:", treasury);
  console.log("Owner:", finalOwner);
  console.log("\nNext steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Update frontend with contract addresses");
  console.log("3. Test all functions on testnet");

  // Save addresses to file
  const addresses = {
    bgpToken: bgpTokenAddress,
    usdtToken: usdtTokenAddress,
    dapp: dappAddress,
    treasury,
    owner: finalOwner,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployment-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nAddresses saved to deployment-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
