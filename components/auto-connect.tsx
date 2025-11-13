'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export function AutoConnect() {
  const { isConnected } = useAccount();
  const [hasTriedConnect, setHasTriedConnect] = useState(false);

  // 自动连接钱包
  useEffect(() => {
    const autoConnect = async () => {
      console.log('🔍 自动连接检查:', {
        hasTriedConnect,
        isConnected
      });

      // 只要未连接就尝试打开（每次刷新都会触发）
      if (!hasTriedConnect && !isConnected) {
        setHasTriedConnect(true);

        console.log('🚀 触发钱包连接弹窗...');

        // 延迟 1500ms 再打开，确保 Web3Modal 已创建
        setTimeout(() => {
          console.log('⏰ 延迟结束，准备触发 w3m-open 事件');
          const event = new CustomEvent('w3m-open');
          window.dispatchEvent(event);
          console.log('✅ w3m-open 事件已触发');
        }, 1500);
      }
    };

    autoConnect();
  }, [hasTriedConnect, isConnected]);

  return null; // 这是一个无 UI 的组件
}
