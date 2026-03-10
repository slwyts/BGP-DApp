import { defineConfig } from "hardhat/config";
import hardhatToolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env.hardhat 文件
dotenvConfig({ path: resolve(__dirname, ".env.hardhat") });

export default defineConfig({
  plugins: [hardhatToolbox],
    solidity: {
    profiles: {
      default: {
        version: "0.8.33",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
      production: {
        version: "0.8.33",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 31337,
      accounts: {
        // Hardhat 默认测试账户
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
    },
    localhost: {
      type: "http" as const,
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    bscTestnet: {
      type: "http" as const,
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 gwei
    },
    bsc: {
      type: "http" as const,
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 3000000000, // 3 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
  },
});
