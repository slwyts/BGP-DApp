import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || forwarded?.split(",")[0] || realIp || "Unknown";

  return NextResponse.json({ ip });
}
