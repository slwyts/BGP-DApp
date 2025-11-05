# Foundry → Hardhat 迁移完成

## ✅ 迁移内容

### 已删除 (Foundry 相关)
- ❌ `foundry.toml` - Foundry 配置文件
- ❌ `foundry.lock` - Foundry 依赖锁定文件
- ❌ `export-abi.sh` - ABI 导出脚本
- ❌ `out/` - Foundry 编译输出目录
- ❌ `cache/` (原 Foundry 缓存) - 已被 Hardhat 缓存替代
- ❌ `lib/` (Openzeppelin 子模块) - 已通过 npm 管理
- ❌ `script/Deploy.s.sol` - Foundry 部署脚本
- ❌ `test/BelaChainDApp.t.sol` - Foundry 测试文件

### 已创建 (Hardhat 相关)
- ✅ `hardhat.config.ts` - Hardhat 配置文件
- ✅ `script/deploy.ts` - TypeScript 部署脚本
- ✅ `test/BelaChainDApp.ts` - Mocha + Chai 测试文件
- ✅ `typechain-types/` - 自动生成的合约类型定义
- ✅ `artifacts/` - Hardhat 编译输出

### 已更新
- 📝 `package.json` - 所有脚本改为 Hardhat 命令
- 📝 `.gitignore` - 更新为 Hardhat 相关的目录和文件

## 📋 可用命令

```bash
# 编译合约
npm run build

# 运行测试
npm run test

# 生成测试覆盖率报告
npm run test:coverage

# 生成 gas 报告
npm run test:gas

# 启动本地测试网络
npm run node

# 部署到本地网络
npm run deploy:local

# 部署到 Arbitrum Sepolia 测试网
npm run deploy:testnet

# 部署到 Arbitrum 主网
npm run deploy:mainnet

# 验证合约
npm run verify

# 代码格式化
npm run format

# Lint 检查
npm run lint

# 清理编译输出
npm run clean
```

## 🔧 环境配置

编辑 `.env` 文件，设置以下变量：

```env
PRIVATE_KEY=your_private_key_here
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key_here
REPORT_GAS=true
```

## 📚 关键改变

### 导入变化
- **Foundry**: `import "forge-std/Test.sol"`
- **Hardhat**: `import { expect } from "chai"`

### 测试框架
- **Foundry**: Forge Test
- **Hardhat**: Mocha + Chai

### 时间操作
- **Foundry**: `vm.warp(block.timestamp + 12 hours)`
- **Hardhat**: `await ethers.provider.send("evm_increaseTime", [12 * 3600])`

### 合约部署
- **Foundry**: Solidity 脚本 (`Deploy.s.sol`)
- **Hardhat**: TypeScript 脚本 (`deploy.ts`)

### 地址获取
- **Foundry**: `address(contract)`
- **Hardhat**: `await contract.getAddress()`

## 🚀 快速开始

### 本地开发
```bash
# 终端 1: 启动本地网络
npm run node

# 终端 2: 部署合约到本地网络
npm run deploy:local

# 终端 2: 运行测试
npm run test
```

### 部署到测试网
```bash
# 确保 .env 中有正确的 PRIVATE_KEY 和 RPC_URL
npm run deploy:testnet

# 验证合约
npm run verify -- --network arbitrumSepolia <contract_address>
```

## 📖 类型定义

所有合约的 TypeScript 类型定义已自动生成在 `typechain-types/` 目录中，可以在脚本和测试中直接导入使用：

```typescript
import { BelaChainDApp, BGPToken, MockUSDT } from "../typechain-types";
```

## ⚠️ 注意事项

1. 确保已安装 Node.js 16+ 版本
2. 所有私钥信息应存储在 `.env` 文件中（已添加到 `.gitignore`）
3. 合约地址会在部署后保存到 `deployment-addresses.json`
4. 运行测试前无需启动网络，Hardhat 会自动创建临时网络

## 🎯 后续步骤

1. ✅ 运行 `npm run test` 验证所有测试通过
2. ✅ 使用 `npm run build` 确认编译无错误
3. ✅ 根据需要调整 `hardhat.config.ts` 中的网络配置
4. ✅ 更新前端代码以使用新部署的合约地址

---

迁移完成！祝你使用 Hardhat 开发愉快！🎉
