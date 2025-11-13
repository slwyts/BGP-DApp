'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function AutoConnect() {
  const { isConnected, address } = useAccount();

  // 仅用于日志记录钱包连接状态
  useEffect(() => {
    if (isConnected && address) {
      console.log('✅ 钱包已连接:', address);
    } else {
      console.log('❌ 钱包未连接');
    }
  }, [isConnected, address]);

  return null; // 这是一个无 UI 的组件，依赖 Web3Modal 的自动重连机制
}
