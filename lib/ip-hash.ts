/**
 * 获取用户 IP 地址并转换为 bytes32 格式
 * 合约使用 IP 地址进行防女巫攻击检测
 */
export async function hashIP(): Promise<string> {
  try {
    // 从公共 API 获取用户真实 IP
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;
    
    // 将 IP 地址转换为 bytes32
    // 例: "192.168.1.1" -> "0x3139322e3136382e312e31000000000000000000000000000000000000000000"
    const ipBytes = new TextEncoder().encode(ip);
    const hex = Array.from(ipBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // 填充到 64 字符 (32 字节)
    return '0x' + hex.padEnd(64, '0');
  } catch (error) {
    console.error('Failed to get IP address:', error);
    // 降级方案: 使用固定值 (开发环境)
    const fallbackIP = "127.0.0.1";
    const ipBytes = new TextEncoder().encode(fallbackIP);
    const hex = Array.from(ipBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return '0x' + hex.padEnd(64, '0');
  }
}
