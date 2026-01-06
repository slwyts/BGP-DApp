import { NextRequest, NextResponse } from 'next/server';

/**
 * API 路由：获取用户真实 IP 地址
 * 优先使用各平台提供的可信 header
 */
export async function GET(request: NextRequest) {
  try {
    let ip: string | null = null;

    // 1. Cloudflare (最可信，无法伪造)
    ip = request.headers.get('cf-connecting-ip');
    if (ip) return NextResponse.json({ ip: cleanIP(ip) });

    // 2. Vercel (可信)
    ip = request.headers.get('x-vercel-forwarded-for');
    if (ip) {
      return NextResponse.json({ ip: cleanIP(ip.split(',')[0]) });
    }

    // 3. x-real-ip (通常由 Nginx 设置，相对可信)
    ip = request.headers.get('x-real-ip');
    if (ip) return NextResponse.json({ ip: cleanIP(ip) });

    // 4. x-forwarded-for (最后手段)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
      if (ip) return NextResponse.json({ ip: cleanIP(ip) });
    }

    // 5. 开发环境 fallback - 使用随机 IP 避免全部相同触发封禁
    const devIP = `10.0.0.${Math.floor(Math.random() * 255)}`;
    return NextResponse.json({ ip: devIP, dev: true });

  } catch (error) {
    console.error('获取 IP 失败:', error);
    return NextResponse.json(
      { error: '获取 IP 失败', ip: '0.0.0.0' },
      { status: 500 }
    );
  }
}

/**
 * 清理 IP 地址格式
 * - 移除端口号
 * - 移除 IPv6 方括号
 */
function cleanIP(ip: string): string {
  ip = ip.trim();

  // 处理 IPv6 带方括号和端口: [2001:db8::1]:8080
  if (ip.startsWith('[')) {
    const bracketEnd = ip.indexOf(']');
    if (bracketEnd !== -1) {
      return ip.slice(1, bracketEnd);
    }
  }

  // 处理 IPv4 带端口: 192.168.1.1:8080
  // 注意：不能简单 split(':')，因为 IPv6 本身包含冒号
  if (ip.includes('.') && ip.includes(':')) {
    return ip.split(':')[0];
  }

  return ip;
}
