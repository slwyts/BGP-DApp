import hre from "hardhat";
import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

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
  shouldDeployMockUSDT: boolean; // 是否部署 MockUSDT
  usdtAddress?: string; // 生产环境使用真实 USDT 地址
  envFileName: string;
}

// Arbitrum 主网 USDT 地址
const ARBITRUM_USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  local: {
    network: "localnet",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    shouldMintTestTokens: true,
    shouldDistributeGas: true,
    shouldDistributeTokens: true,
    shouldDeployMockUSDT: true,
    envFileName: ".env.local",
  },
  development: {
    network: "arbitrum-sepolia",
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    shouldMintTestTokens: true,  // 铸造测试 USDT
    shouldDistributeGas: false,   // 不分发 Gas（需要自己有测试 ETH）
    shouldDistributeTokens: true, // 分发测试代币
    shouldDeployMockUSDT: true,
    envFileName: ".env.development",
  },
  production: {
    network: "arbitrum",
    chainId: 42161,
    rpcUrl: "https://arbitrum-one-rpc.publicnode.com",
    shouldMintTestTokens: false, // 不铸造测试币
    shouldDistributeGas: false,   // 不分发 Gas
    shouldDistributeTokens: false, // 不分发代币
    shouldDeployMockUSDT: false, // 不部署 MockUSDT
    usdtAddress: ARBITRUM_USDT_ADDRESS, // 使用真实 USDT
    envFileName: ".env.production",
  },
};

async function main() {
  // 获取 ethers from network connection (Hardhat 3.x)
  const connection = await network.connect();
  const ethers = connection.ethers;
  
  if (!ethers) {
    throw new Error("Ethers not found on network connection. Make sure @nomicfoundation/hardhat-ethers is properly installed.");
  }
  
  // 根据 chainId 判断环境
  const chainId = await connection.provider.request({ method: 'eth_chainId' });
  const chainIdNum = parseInt(chainId, 16);
  
  let env: Environment = "local";
  if (chainIdNum === 1337 || chainIdNum === 31337) {
    env = "local";
  } else if (chainIdNum === 421614) {
    env = "development";
  } else if (chainIdNum === 42161) {
    env = "production";
  }
  
  const config = ENV_CONFIGS[env];
  
  console.log("🚀 开始部署合约...");
  console.log(`📍 环境: ${env.toUpperCase()}`);
  console.log(`🌐 网络: ${config.network}\n`);

  const [deployer] = await ethers.getSigners();
  
  // 根据环境设置 owner 地址
  let ownerAddress: string;
  if (env === "production") {
    // 生产环境使用 PROD_OWNER 环境变量
    ownerAddress = process.env.PROD_OWNER || "";
    if (!ownerAddress) {
      throw new Error("❌ 生产环境部署必须设置 PROD_OWNER 环境变量！");
    }
  } else {
    // 测试环境使用固定的测试地址
    ownerAddress = "0xa4b76d7cae384c9a5fd5f573cef74bfdb980e966";
  }
  
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

  // 3. 获取或部署 USDT
  let usdtAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let usdtContract: any = null;
  
  if (config.shouldDeployMockUSDT) {
    // 测试环境：部署 MockUSDT
    console.log("📦 部署 MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();
    usdtContract = usdt;
    console.log("✅ MockUSDT 部署成功:", usdtAddress, "\n");

    // 给部署者铸造 USDT（仅测试环境）
    if (config.shouldMintTestTokens) {
      console.log("💰 铸造 USDT 到部署者...");
      const usdtMintAmount = ethers.parseUnits("10000000", 6); // 1000万 USDT
      const tx0 = await usdt.mint(deployer.address, usdtMintAmount);
      await tx0.wait();
      console.log("✅ 已铸造", ethers.formatUnits(usdtMintAmount, 6), "USDT\n");
    }
  } else {
    // 生产环境：使用真实 USDT 地址
    usdtAddress = config.usdtAddress!;
    console.log("📍 使用真实 USDT 地址:", usdtAddress, "\n");
  }

  // 4. 部署 BelaChainDApp
  console.log("📦 部署 BelaChainDApp...");
  const BelaChainDApp = await ethers.getContractFactory("BelaChainDApp");
  const dapp = await BelaChainDApp.deploy(
    bgpTokenAddress,
    usdtAddress
  );
  await dapp.waitForDeployment();
  const dappAddress = await dapp.getAddress();
  console.log("✅ BelaChainDApp 部署成功:", dappAddress, "\n");

  // 5. 设置 AntiSybil 的 DApp 合约地址（必须在转移所有权之前）
  console.log("⚙️  设置 AntiSybil.setDappContract...");
  const tx1 = await antiSybil.setDappContract(dappAddress);
  await tx1.wait();
  console.log("✅ AntiSybil DApp 地址设置完成\n");

  // 6. 转移 BGP 代币
  const totalSupply = await bgpToken.totalSupply();
  
  if (env === "production") {
    // 生产环境：50% 给 DApp 合约，50% 给 owner
    const halfSupply = totalSupply / BigInt(2);
    
    console.log("💸 转移 50% BGP 到 DApp 合约...");
    const tx2a = await bgpToken.transfer(dappAddress, halfSupply);
    await tx2a.wait();
    console.log("✅ 已转移", ethers.formatEther(halfSupply), "BGP 到 DApp\n");
    
    console.log("💸 转移 50% BGP 到 Owner...");
    const tx2b = await bgpToken.transfer(ownerAddress, halfSupply);
    await tx2b.wait();
    console.log("✅ 已转移", ethers.formatEther(halfSupply), "BGP 到 Owner\n");
  } else {
    // 测试环境：50% 给 DApp 合约，其余留给 deployer 用于测试
    console.log("💸 转移 50% BGP 到 DApp 合约...");
    const halfSupply = totalSupply / BigInt(2);
    const tx2 = await bgpToken.transfer(dappAddress, halfSupply);
    await tx2.wait();
    console.log("✅ 已转移", ethers.formatEther(halfSupply), "BGP 到 DApp\n");
  }

  // 7. 转移 USDT 到 DApp 合约（用于等级奖励）
  if (config.shouldMintTestTokens && usdtContract) {
    console.log("💸 转移 USDT 到 DApp 合约...");
    const usdtAmount = ethers.parseUnits("3000000", 6); // 300万 USDT
    const tx3 = await usdtContract.transfer(dappAddress, usdtAmount);
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
      if (config.shouldDistributeTokens && usdtContract) {
        // 转 BGP
        const bgpAmount = ethers.parseEther("100000"); // 10万 BGP
        const tx5 = await bgpToken.transfer(testAddr, bgpAmount);
        await tx5.wait();
        
        // 转 USDT
        const testUsdtAmount = ethers.parseUnits("10000", 6); // 1万 USDT
        const tx6 = await usdtContract.transfer(testAddr, testUsdtAmount);
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

  const tx8 = await dapp.transferOwnership(ownerAddress);
  await tx8.wait();
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
# - AntiSybil 地址: ${antiSybilAddress} (DApp 通过 BGPToken.antiSybilContract() 获取)
# - Owner/Treasury: ${ownerAddress} (前端可通过 DApp.owner() 查询)
`;

  const envPath = path.join(__dirname, "..", config.envFileName);
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ ${config.envFileName} 文件已生成\n`);
  console.log("=" .repeat(60));
  console.log(`📋 部署摘要 (${env.toUpperCase()})`);
  console.log("=" .repeat(60));
  console.log("环境:          ", env);
  console.log("网络:          ", config.network);
  console.log("Chain ID:      ", chainIdNum, "(实际连接)");
  console.log("AntiSybil:     ", antiSybilAddress);
  console.log("BGPToken:      ", bgpTokenAddress);
  console.log("USDT:          ", usdtAddress, env === "production" ? "(Arbitrum官方)" : "(MockUSDT)");
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
