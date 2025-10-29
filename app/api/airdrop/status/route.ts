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

export async function GET(req: NextRequest) {
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
  if (!slots || slots.day !== day) {
    slots = { day, s00: false, s12: false };
  }

  const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
  const slotsLeft = Math.max(0, 2 - claimsToday);

  // Determine current slot that has started
  let currentSlot: "00:00" | "12:00" | null = null;
  if (now >= noon) currentSlot = "12:00";
  else if (now >= midnight) currentSlot = "00:00";

  const claimable =
    (currentSlot === "00:00" && !slots.s00) ||
    (currentSlot === "12:00" && !slots.s12);

  // Next slot time
  let next: Date;
  if (now < midnight) next = midnight;
  else if (now < noon) next = noon;
  else next = new Date(tomorrow);

  const data = {
    now: now.getTime(),
    next: next.getTime(),
    currentSlot,
    claimable,
    claimsToday,
    slotsLeft,
    day,
  };

  const res = NextResponse.json(data);
  res.cookies.set(cookieKey, JSON.stringify(slots), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
