# Web3Modal + Wagmi 集成完成

## ✅ 已完成

### 1. 安装依赖
```bash
npm install @web3modal/wagmi wagmi viem @tanstack/react-query
```

### 2. 配置文件
- ✅ `lib/web3.ts` - Wagmi 配置
- ✅ `components/web3-provider.tsx` - Provider 组件
- ✅ `components/connect-button.tsx` - 连接钱包按钮
- ✅ `lib/hooks/use-contracts.ts` - 合约交互 Hooks

### 3. 集成到应用
- ✅ 更新 `app/layout.tsx` 添加 Web3Provider
- ✅ 更新 `components/site-header.tsx` 添加连接按钮

### 4. 合约 ABI 导出
- ✅ BGPToken.json
- ✅ BelaChainDApp.json
- ✅ addresses.ts - 合约地址配置
- ✅ types.ts - TypeScript 类型定义

## 📝 使用指南

### 获取 WalletConnect Project ID

1. 访问 https://cloud.walletconnect.com
2. 注册并创建新项目
3. 复制 Project ID
4. 更新 `.env.local`:
   ```bash
   NEXT_PUBLIC_PROJECT_ID=your_project_id_here
   ```

### 使用合约 Hooks

```typescript
import { useUserInfo, useBGPBalance, useInteract } from '@/lib/hooks/use-contracts'

function Component() {
  // 获取用户信息
  const { userInfo, isLoading } = useUserInfo()
  
  // 获取 BGP 余额
  const { balance } = useBGPBalance()
  
  // 每日交互
  const { interact, isPending, isSuccess } = useInteract()
  
  const handleInteract = async () => {
    const ipHash = '0x...' // 从后端获取
    await interact(ipHash)
  }
  
  return (
    <div>
      <p>BGP Balance: {balance}</p>
      <button onClick={handleInteract} disabled={isPending}>
        {isPending ? 'Processing...' : 'Interact'}
      </button>
    </div>
  )
}
```

### 可用的 Hooks

1. **useUserInfo()** - 获取用户完整信息
   - 推荐信息
   - 等级信息
   - 交互统计

2. **useBGPBalance()** - 获取 BGP 余额

3. **useRegister(referrer)** - 注册推荐人

4. **useInteract(ipHash)** - 每日交互

5. **useClaimLevelReward(level)** - 领取等级奖励

6. **useWithdrawUSDT()** - 提现 USDT

7. **useTransferBGP(to, amount)** - 转账 BGP

8. **useIsBlacklisted()** - 检查是否被封禁

## 🚀 下一步

### 1. 更新合约地址
部署合约后，更新 `lib/contracts/addresses.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  testnet: {
    bgpToken: '0x实际部署的BGPToken地址',
    belaChainDApp: '0x实际部署的DApp地址',
  },
}
```

### 2. 集成到页面

#### app/page.tsx - 首页
- 显示连接钱包状态
- 显示 BGP 余额
- 显示每日交互按钮

#### app/me/page.tsx - 个人中心
- 显示用户完整信息
- 显示推荐链接
- 显示等级进度

#### app/rewards/page.tsx - 奖励页面
- 显示可提现 USDT
- 显示等级奖励
- 添加提现按钮

#### app/team/page.tsx - 团队页面
- 显示直推人数
- 显示团队规模
- 显示贡献值

### 3. IP 哈希获取
创建后端 API 获取用户 IP 哈希:

```typescript
// app/api/ip-hash/route.ts
import { NextRequest } from 'next/server'
import { keccak256, toUtf8Bytes } from 'viem'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1'
  
  const ipHash = keccak256(toUtf8Bytes(ip))
  
  return Response.json({ ipHash })
}
```

### 4. 错误处理
添加 Toast 通知组件处理交易状态:

```bash
npm install sonner
```

```typescript
import { toast } from 'sonner'

const { interact, isSuccess, error } = useInteract()

useEffect(() => {
  if (isSuccess) {
    toast.success('交互成功！获得 2000 BGP')
  }
  if (error) {
    toast.error(error.message)
  }
}, [isSuccess, error])
```

## 🔗 相关链接

- Web3Modal 文档: https://docs.walletconnect.com/appkit/react/core/installation
- Wagmi 文档: https://wagmi.sh
- Viem 文档: https://viem.sh

## 🎯 开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

## ✨ 功能清单

- [x] Web3Modal 集成
- [x] 钱包连接/断开
- [x] 合约 ABI 导出
- [x] 合约交互 Hooks
- [ ] IP 哈希 API
- [ ] 页面集成合约功能
- [ ] 交易状态通知
- [ ] 错误处理
- [ ] 加载状态
- [ ] 测试网部署
- [ ] 主网上线
