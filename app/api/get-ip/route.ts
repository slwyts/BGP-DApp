import { NextRequest, NextResponse } from 'next/server';

/**
 * API 路由：获取用户真实 IP 地址
 * 优先级：x-forwarded-for > x-real-ip > remoteAddress
 */
export async function GET(request: NextRequest) {
  try {
    // 优先从 x-forwarded-for 获取（Vercel、Cloudflare 等代理环境）
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      const ip = forwardedFor.split(',')[0].trim();
      return NextResponse.json({ ip });
    }

    // 其次尝试 x-real-ip
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return NextResponse.json({ ip: realIP });
    }

    // 开发环境 fallback
    return NextResponse.json({ ip: '127.0.0.1' });
  } catch (error) {
    console.error('获取 IP 失败:', error);
    return NextResponse.json(
      { error: '获取 IP 失败', ip: '127.0.0.1' },
      { status: 500 }
    );
  }
}
