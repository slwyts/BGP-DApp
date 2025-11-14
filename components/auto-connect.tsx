'use client';

import { useEffect } from 'react';
import { useAccount, useConnect, useReconnect } from 'wagmi';

export function AutoConnect() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { reconnect } = useReconnect();

  // 自动重连上次使用的钱包
  useEffect(() => {
    reconnect();
  }, [reconnect]);

  // 如果重连失败，尝试自动连接第一个可用的钱包
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      const timer = setTimeout(() => {
        const connector = connectors[0];
        if (connector) {
          connect({ connector });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, connectors, connect]);

  // 日志记录钱包连接状态
  useEffect(() => {
    if (isConnected && address) {
      console.log('✅ 钱包已连接:', address);
    }
  }, [isConnected, address]);

  return null;
}
