/**
 * 获取用户 IP 地址并转换为 bytes16 格式（128位，支持 IPv4 和 IPv6）
 * 合约使用 IP 地址进行防女巫攻击检测
 * 
 * IPv4 将被转换为 IPv6 映射地址格式: ::ffff:192.168.1.1
 * IPv6 直接使用原生格式
 */
export async function hashIP(): Promise<string> {
  // 调用 Next.js 服务端 API 获取用户真实 IP
  const response = await fetch('/api/get-ip');
  const data = await response.json();
  const ip = data.ip;
  
  // 转换为 bytes16 (128位)
  return ipToBytes16(ip);
}

/**
 * 将 IP 地址（IPv4 或 IPv6）转换为 bytes16 (0x + 32位十六进制)
 * @param ip IP 地址字符串
 * @returns bytes16 格式的十六进制字符串
 */
function ipToBytes16(ip: string): string {
  if (isIPv4(ip)) {
    return ipv4ToBytes16(ip);
  } else if (isIPv6(ip)) {
    return ipv6ToBytes16(ip);
  } else {
    throw new Error(`Invalid IP address format: ${ip}`);
  }
}

/**
 * 检查是否为 IPv4 地址
 */
function isIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * 检查是否为 IPv6 地址
 */
function isIPv6(ip: string): boolean {
  // 简化的 IPv6 检测（支持标准格式和压缩格式）
  const ipv6Regex = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^::$|^([\da-fA-F]{1,4}:){0,6}::([\da-fA-F]{1,4}:){0,6}[\da-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * 将 IPv4 地址转换为 IPv6 映射地址格式，再转为 bytes16
 * 例: "192.168.1.1" -> "::ffff:192.168.1.1" -> "0x00000000000000000000ffffc0a80101"
 */
function ipv4ToBytes16(ip: string): string {
  const parts = ip.split('.').map(part => parseInt(part, 10));
  
  // IPv4-Mapped IPv6 地址格式: 前80位为0, 接着16位全1 (0xffff), 最后32位是IPv4
  // 格式: 0000:0000:0000:0000:0000:ffff:xxxx:xxxx
  const bytes = new Uint8Array(16);
  
  // 前10个字节为 0 (已经初始化为0)
  // 第11-12字节为 0xff
  bytes[10] = 0xff;
  bytes[11] = 0xff;
  
  // 第13-16字节为 IPv4 地址
  bytes[12] = parts[0];
  bytes[13] = parts[1];
  bytes[14] = parts[2];
  bytes[15] = parts[3];
  
  // 转换为十六进制字符串
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return '0x' + hex;
}

/**
 * 将 IPv6 地址转换为 bytes16
 * 例: "2001:db8::1" -> "0x20010db8000000000000000000000001"
 */
function ipv6ToBytes16(ip: string): string {
  // 展开压缩的 IPv6 地址
  const expandedIP = expandIPv6(ip);
  
  // 移除冒号，得到完整的32位十六进制字符串
  const hex = expandedIP.replace(/:/g, '');
  
  return '0x' + hex.toLowerCase();
}

/**
 * 展开压缩的 IPv6 地址
 * 例: "2001:db8::1" -> "2001:0db8:0000:0000:0000:0000:0000:0001"
 */
function expandIPv6(ip: string): string {
  // 处理 :: 压缩
  if (ip.includes('::')) {
    const sides = ip.split('::');
    const leftGroups = sides[0] ? sides[0].split(':') : [];
    const rightGroups = sides[1] ? sides[1].split(':') : [];
    const missingGroups = 8 - leftGroups.length - rightGroups.length;
    
    const middleGroups = Array(missingGroups).fill('0000');
    const allGroups = [...leftGroups, ...middleGroups, ...rightGroups];
    
    return allGroups.map(g => g.padStart(4, '0')).join(':');
  }
  
  // 没有压缩，只需补齐每组
  return ip.split(':').map(g => g.padStart(4, '0')).join(':');
}
