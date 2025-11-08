import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 环境配置
type Environment = "local" | "development" | "production";

interface EnvConfig {
  network: string;
  chainId: number;
  rpcUrl: string;
  shouldMintTestTokens: boolean; // 是否铸造测试币
  shouldDistributeGas: boolean;  // 是否分发 Gas
  shouldDistributeTokens: boolean; // 是否分发测试代币
  envFileName: string;
}

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  local: {
    network: "localnet",
    chainId: 1337,
    rpcUrl: "http://127.0.0.1:8545",
    shouldMintTestTokens: true,
    shouldDistributeGas: true,
    shouldDistributeTokens: true,
    envFileName: ".env.local",
  },
  development: {
    network: "arbitrum-sepolia",
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    shouldMintTestTokens: true,  // 铸造测试 USDT
    shouldDistributeGas: false,   // 不分发 Gas（需要自己有测试 ETH）
    shouldDistributeTokens: true, // 分发测试代币
    envFileName: ".env.development",
  },
  production: {
    network: "arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    shouldMintTestTokens: false, // 不铸造测试币
    shouldDistributeGas: false,   // 不分发 Gas
    shouldDistributeTokens: false, // 不分发代币
    envFileName: ".env.production",
  },
};

// 根据 hardhat 网络判断环境
function getEnvironment(): Environment {
  const network = hre.network.name;
  if (network === "localhost" || network === "hardhat") {
    return "local";
  } else if (network === "arbitrumSepolia") {
    return "development";
  } else if (network === "arbitrum") {
    return "production";
  }
  return "local"; // 默认
}

async function main() {
  const env = getEnvironment();
  const config = ENV_CONFIGS[env];
  
  console.log("🚀 开始部署合约...");
  console.log(`📍 环境: ${env.toUpperCase()}`);
  console.log(`🌐 网络: ${config.network}\n`);

  const [deployer] = await ethers.getSigners();
  const ownerAddress = "0xa4b76d7cae384c9a5fd5f573cef74bfdb980e966"; // 你的地址作为 owner
  
  console.log("📝 部署账户:", deployer.address);
  console.log("👑 Owner 地址:", ownerAddress);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. 部署 AntiSybil
  console.log("📦 部署 AntiSybil...");
  const AntiSybil = await ethers.getContractFactory("AntiSybil");
  const antiSybil = await AntiSybil.deploy();
  await antiSybil.waitForDeployment();
  const antiSybilAddress = await antiSybil.getAddress();
  console.log("✅ AntiSybil 部署成功:", antiSybilAddress, "\n");

  // 2. 部署 BGPToken
  console.log("📦 部署 BGPToken...");
  const BGPToken = await ethers.getContractFactory("BGPToken");
  const bgpToken = await BGPToken.deploy(antiSybilAddress);
  await bgpToken.waitForDeployment();
  const bgpTokenAddress = await bgpToken.getAddress();
  console.log("✅ BGPToken 部署成功:", bgpTokenAddress, "\n");

  // 3. 部署 MockUSDT (测试用)
  console.log("📦 部署 MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("✅ MockUSDT 部署成功:", usdtAddress, "\n");

  // 3.5 给部署者铸造 USDT（仅测试环境）
  if (config.shouldMintTestTokens) {
    console.log("💰 铸造 USDT 到部署者...");
    const usdtMintAmount = ethers.parseUnits("10000000", 6); // 1000万 USDT
    const tx0 = await usdt.mint(deployer.address, usdtMintAmount);
    await tx0.wait();
    console.log("✅ 已铸造", ethers.formatUnits(usdtMintAmount, 6), "USDT\n");
  }

  // 4. 部署 BelaChainDApp
  console.log("📦 部署 BelaChainDApp...");
  const BelaChainDApp = await ethers.getContractFactory("BelaChainDApp");
  const dapp = await BelaChainDApp.deploy(
    bgpTokenAddress,
    usdtAddress,
    antiSybilAddress
  );
  await dapp.waitForDeployment();
  const dappAddress = await dapp.getAddress();
  console.log("✅ BelaChainDApp 部署成功:", dappAddress, "\n");

  // 5. 设置 AntiSybil 的 DApp 合约地址（必须在转移所有权之前）
  console.log("⚙️  设置 AntiSybil.setDappContract...");
  const tx1 = await antiSybil.setDappContract(dappAddress);
  await tx1.wait();
  console.log("✅ AntiSybil DApp 地址设置完成\n");

  // 6. 转移 50% BGP 到 DApp 合约
  console.log("💸 转移 50% BGP 到 DApp 合约...");
  const totalSupply = await bgpToken.totalSupply();
  const halfSupply = totalSupply / BigInt(2);
  const tx2 = await bgpToken.transfer(dappAddress, halfSupply);
  await tx2.wait();
  console.log("✅ 已转移", ethers.formatEther(halfSupply), "BGP 到 DApp\n");

  // 7. 转移 USDT 到 DApp 合约（用于等级奖励）
  if (config.shouldMintTestTokens) {
    console.log("💸 转移 USDT 到 DApp 合约...");
    const usdtAmount = ethers.parseUnits("3000000", 6); // 300万 USDT
    const tx3 = await usdt.transfer(dappAddress, usdtAmount);
    await tx3.wait();
    console.log("✅ 已转移", ethers.formatUnits(usdtAmount, 6), "USDT 到 DApp\n");
  }

  // 7.5 给测试地址分配资金（根据环境配置）
  if (config.shouldDistributeGas || config.shouldDistributeTokens) {
    console.log("💰 给测试地址分配资金...");
    const testAddresses = [
      "0xa4b76d7cae384c9a5fd5f573cef74bfdb980e966",
      "0x98c2e0ecdfa961f8b36144c743fea3951dad0309",
      "0x676a05c975f447ea13bf09219a1c3acf81031fec",
    ];
    
    for (const testAddr of testAddresses) {
      // 转 ETH (用于 gas) - 仅 local 环境
      if (config.shouldDistributeGas) {
        const ethAmount = ethers.parseEther("100"); // 100 ETH
        const tx4 = await deployer.sendTransaction({
          to: testAddr,
          value: ethAmount,
        });
        await tx4.wait();
        console.log(`  ✅ ${testAddr}: 100 ETH (gas)`);
      }
      
      // 转测试代币 - local 和 development 环境
      if (config.shouldDistributeTokens) {
        // 转 BGP
        const bgpAmount = ethers.parseEther("100000"); // 10万 BGP
        const tx5 = await bgpToken.transfer(testAddr, bgpAmount);
        await tx5.wait();
        
        // 转 USDT
        const testUsdtAmount = ethers.parseUnits("10000", 6); // 1万 USDT
        const tx6 = await usdt.transfer(testAddr, testUsdtAmount);
        await tx6.wait();
        
        console.log(`  ✅ ${testAddr}: 10万 BGP + 1万 USDT`);
      }
    }
    console.log();
  }

  // 8. 转移所有权给 owner
  console.log("👑 转移合约所有权给:", ownerAddress);
  
  const tx7 = await antiSybil.transferOwnership(ownerAddress);
  await tx7.wait();
  console.log("  ✅ AntiSybil 所有权转移完成");

  const tx8 = await bgpToken.transferOwnership(ownerAddress);
  await tx8.wait();
  console.log("  ✅ BGPToken 所有权转移完成");

  const tx9 = await dapp.transferOwnership(ownerAddress);
  await tx9.wait();
  console.log("  ✅ BelaChainDApp 所有权转移完成");
  console.log();

  // 9. 生成环境配置文件
  console.log(`📄 生成 ${config.envFileName} 文件...`);
  const envContent = `# ${env.toUpperCase()} 环境配置
# 由 scripts/deploy.ts 自动生成
# 生成时间: ${new Date().toISOString()}

# WalletConnect Project ID
NEXT_PUBLIC_PROJECT_ID=3d90ecf73643b88d05e10bcea74ed9ed

# 网络模式
NEXT_PUBLIC_NETWORK=${config.network}

# Chain ID
NEXT_PUBLIC_CHAIN_ID=${config.chainId}

# 合约地址（前端需要的核心地址）
NEXT_PUBLIC_BGP_TOKEN_ADDRESS=${bgpTokenAddress}
NEXT_PUBLIC_USDT_ADDRESS=${usdtAddress}
NEXT_PUBLIC_DAPP_ADDRESS=${dappAddress}

# RPC URL
NEXT_PUBLIC_RPC_URL=${config.rpcUrl}

# 注意: 
# - AntiSybil 地址: ${antiSybilAddress} (前端无需配置，DApp 内部调用)
# - Owner/Treasury: ${ownerAddress} (前端可通过 DApp.owner() 查询)
`;

  const envPath = path.join(__dirname, "..", config.envFileName);
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ ${config.envFileName} 文件已生成\n`);

  // 10. 打印部署摘要
  console.log("=" .repeat(60));
  console.log(`📋 部署摘要 (${env.toUpperCase()})`);
  console.log("=" .repeat(60));
  console.log("环境:          ", env);
  console.log("网络:          ", config.network);
  console.log("Chain ID:      ", config.chainId);
  console.log("AntiSybil:     ", antiSybilAddress);
  console.log("BGPToken:      ", bgpTokenAddress);
  console.log("MockUSDT:      ", usdtAddress);
  console.log("BelaChainDApp: ", dappAddress);
  console.log("Owner/Treasury:", ownerAddress);
  console.log("=" .repeat(60));
  console.log("\n✅ 部署完成！");
  console.log("\n💡 提示:");
  console.log(`   1. ${config.envFileName} 已自动生成`);
  console.log("   2. 运行 'npm run dev' 启动前端");
  if (config.shouldMintTestTokens) {
    console.log("   3. DApp 合约已获得 50% BGP 和 300万 USDT");
  }
  if (config.shouldDistributeTokens) {
    console.log("   4. 测试地址已分配测试代币");
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
