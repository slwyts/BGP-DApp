import { NextRequest, NextResponse } from "next/server";

type Slots = {
  day: string;
  s00: boolean;
  s12: boolean;
};

function dayString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function getTodaySlots(now = new Date()) {
  const day = dayString(now);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  const tomorrow = new Date(midnight);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { day, midnight, noon, tomorrow };
}

// no-op cookie helpers (NextRequest/NextResponse used below)

export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const addr = (url.searchParams.get("addr") || "anon").toLowerCase();
  const cookieKey = `airdrop_${addr}`;
  const now = new Date();
  const { day, midnight, noon, tomorrow } = getTodaySlots(now);
  let slots: Slots | null = null;
  try {
    const raw = req.cookies.get(cookieKey)?.value;
    if (raw) slots = JSON.parse(raw) as Slots;
  } catch {}
  if (!slots || slots.day !== day) slots = { day, s00: false, s12: false };

  let slot: "00:00" | "12:00" | null = null;
  if (now >= noon) slot = "12:00";
  else if (now >= midnight) slot = "00:00";

  const already =
    slot === "00:00" ? slots.s00 : slot === "12:00" ? slots.s12 : true;
  if (!slot || already) {
    return NextResponse.json(
      { success: false, reason: "not-claimable" },
      { status: 400 },
    );
  }

  // Mark claimed
  if (slot === "00:00") slots.s00 = true;
  if (slot === "12:00") slots.s12 = true;
  const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
  let next: Date;
  if (now < midnight) next = midnight;
  else if (now < noon) next = noon;
  else next = new Date(tomorrow);

  // Simple demo payout
  const payout = { bgp: 200, usdt: 0.5 };

  const res = NextResponse.json({
    success: true,
    slot,
    payout,
    next: next.getTime(),
    claimsToday,
  });
  res.cookies.set(cookieKey, JSON.stringify(slots), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
