import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked } from 'viem';
import * as ipaddr from 'ipaddr.js';

/**
 * API 路由：为用户注册生成 IP 签名
 *
 * 请求体:
 * - userAddress: 用户 EVM 地址
 *
 * 返回:
 * - ipAddr: IP 地址 (bytes16 格式)
 * - timestamp: 签名时间戳
 * - signature: 服务器签名
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress || !userAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid user address' },
        { status: 400 }
      );
    }

    const privateKey = process.env.IP_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      console.error('IP_SIGNER_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Server signing not configured' },
        { status: 500 }
      );
    }

    const ip = getClientIP(request);
    if (!ip) {
      console.error('Unable to determine client IP');
      return NextResponse.json(
        { error: 'Unable to determine client IP' },
        { status: 400 }
      );
    }
    const ipAddr = ipToBytes16(ip);
    const timestamp = Math.floor(Date.now() / 1000);

    const messageHash = keccak256(
      encodePacked(
        ['address', 'bytes16', 'uint256'],
        [userAddress as `0x${string}`, ipAddr as `0x${string}`, BigInt(timestamp)]
      )
    );

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signature = await account.signMessage({
      message: { raw: messageHash as `0x${string}` }
    });

    return NextResponse.json({
      ipAddr,
      timestamp,
      signature,
      debug: { ip, signer: account.address }
    });

  } catch (error) {
    console.error('签名失败:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}

/**
 * 获取客户端真实 IP
 */
function getClientIP(request: NextRequest): string | undefined {
  const headers = [
    'cf-connecting-ip',      // Cloudflare
    'x-vercel-forwarded-for', // Vercel
    'x-real-ip',
    'x-forwarded-for',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0].trim();
    }
  }

  // 开发环境 fallback
  //return `10.0.0.${Math.floor(Math.random() * 255)}`;
}

/**
 * 将 IP 地址转换为 bytes16 格式
 * IPv4 使用 IPv4-mapped IPv6 格式: ::ffff:x.x.x.x
 */
function ipToBytes16(ip: string): string {
  const parsed = ipaddr.parse(ip);

  // IPv4-mapped IPv6 (如 ::ffff:127.0.0.1) 转为 IPv4 处理
  if (parsed.kind() === 'ipv6') {
    const v6 = parsed as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      return ipv4ToBytes16(v6.toIPv4Address().octets);
    }
    return ipv6ToBytes16(v6.parts);
  }

  return ipv4ToBytes16((parsed as ipaddr.IPv4).octets);
}

function ipv4ToBytes16(octets: number[]): string {
  const bytes = new Uint8Array(16);
  // IPv4-mapped IPv6: ::ffff:x.x.x.x
  bytes[10] = 0xff;
  bytes[11] = 0xff;
  bytes[12] = octets[0];
  bytes[13] = octets[1];
  bytes[14] = octets[2];
  bytes[15] = octets[3];

  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function ipv6ToBytes16(parts: number[]): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    bytes[i * 2] = (parts[i] >> 8) & 0xff;
    bytes[i * 2 + 1] = parts[i] & 0xff;
  }
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
