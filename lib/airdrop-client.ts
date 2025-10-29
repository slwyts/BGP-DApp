// 客户端空投逻辑（替代 API 路由）
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

function getStorageKey(addr: string) {
  return `airdrop_${addr.toLowerCase()}`;
}

function getSlots(addr: string): Slots {
  const now = new Date();
  const { day } = getTodaySlots(now);
  
  try {
    const raw = localStorage.getItem(getStorageKey(addr));
    if (raw) {
      const slots = JSON.parse(raw) as Slots;
      if (slots.day === day) {
        return slots;
      }
    }
  } catch {}
  
  return { day, s00: false, s12: false };
}

function saveSlots(addr: string, slots: Slots) {
  try {
    localStorage.setItem(getStorageKey(addr), JSON.stringify(slots));
  } catch {}
}

export function getAirdropStatus(addr: string = "anon") {
  const now = new Date();
  const { day, midnight, noon, tomorrow } = getTodaySlots(now);
  const slots = getSlots(addr);

  let slot: "00:00" | "12:00" | null = null;
  if (now >= noon) slot = "12:00";
  else if (now >= midnight) slot = "00:00";

  const already =
    slot === "00:00" ? slots.s00 : slot === "12:00" ? slots.s12 : true;
  const claimable = !!slot && !already;
  
  const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
  
  let next: Date;
  if (now < midnight) next = midnight;
  else if (now < noon) next = noon;
  else next = new Date(tomorrow);

  return {
    claimable,
    claimsToday,
    next: next.getTime(),
    currentSlot: slot,
  };
}

export function claimAirdrop(addr: string = "anon") {
  const now = new Date();
  const { day, midnight, noon, tomorrow } = getTodaySlots(now);
  const slots = getSlots(addr);

  // 确保是今天的数据
  if (slots.day !== day) {
    slots.day = day;
    slots.s00 = false;
    slots.s12 = false;
  }

  let slot: "00:00" | "12:00" | null = null;
  if (now >= noon) slot = "12:00";
  else if (now >= midnight) slot = "00:00";

  const already =
    slot === "00:00" ? slots.s00 : slot === "12:00" ? slots.s12 : true;
  
  if (!slot || already) {
    return {
      success: false,
      reason: "not-claimable",
    };
  }

  // 标记为已领取
  if (slot === "00:00") slots.s00 = true;
  if (slot === "12:00") slots.s12 = true;
  
  saveSlots(addr, slots);
  
  const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
  
  let next: Date;
  if (now < midnight) next = midnight;
  else if (now < noon) next = noon;
  else next = new Date(tomorrow);

  // 简单的奖励计算
  const payout = { bgp: 200, usdt: 0.5 };

  return {
    success: true,
    slot,
    payout,
    next: next.getTime(),
    claimsToday,
  };
}
