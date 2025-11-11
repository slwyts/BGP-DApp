'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export function AutoConnect() {
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();
  const [hasTriedConnect, setHasTriedConnect] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

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

  // 连接成功后自动签名
  useEffect(() => {
    const autoSign = async () => {
      if (isConnected && address && !hasSigned) {
        setHasSigned(true);

        console.log('📝 准备请求签名...', address);

        // 准备签名消息
        const message = `Welcome to Belachain!\n\nPlease sign this message to verify your wallet ownership.\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;

        try {
          // 延迟 1500ms 再请求签名，让连接完成
          setTimeout(async () => {
            await signMessage({ message });
            console.log('✅ 自动签名成功');
          }, 1500);
        } catch (error) {
          console.log('❌ 用户取消签名或签名失败:', error);
          // 重置状态，允许后续重试
          setHasSigned(false);
        }
      }
    };

    autoSign();
  }, [isConnected, address, hasSigned, signMessage]);

  // 钱包断开时重置状态
  useEffect(() => {
    if (!isConnected) {
      setHasSigned(false);
    }
  }, [isConnected]);

  return null; // 这是一个无 UI 的组件
}
