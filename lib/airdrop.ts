// 客户端空投逻辑
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

export class AirdropManager {
  private getStorageKey(addr: string) {
    return `airdrop_${addr.toLowerCase()}`;
  }

  private getSlots(addr: string): Slots {
    const key = this.getStorageKey(addr);
    const { day } = getTodaySlots();
    
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const slots = JSON.parse(raw) as Slots;
        if (slots.day === day) return slots;
      }
    } catch {}
    
    return { day, s00: false, s12: false };
  }

  private saveSlots(addr: string, slots: Slots) {
    const key = this.getStorageKey(addr);
    localStorage.setItem(key, JSON.stringify(slots));
  }

  getStatus(addr: string = "anon") {
    const now = new Date();
    const { day, midnight, noon, tomorrow } = getTodaySlots(now);
    const slots = this.getSlots(addr);

    const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
    const slotsLeft = Math.max(0, 2 - claimsToday);

    let currentSlot: "00:00" | "12:00" | null = null;
    if (now >= noon) currentSlot = "12:00";
    else if (now >= midnight) currentSlot = "00:00";

    const claimable =
      (currentSlot === "00:00" && !slots.s00) ||
      (currentSlot === "12:00" && !slots.s12);

    let next: Date;
    if (now < midnight) next = midnight;
    else if (now < noon) next = noon;
    else next = new Date(tomorrow);

    return {
      now: now.getTime(),
      next: next.getTime(),
      currentSlot,
      claimable,
      claimsToday,
      slotsLeft,
      day,
    };
  }

  claim(addr: string = "anon") {
    const now = new Date();
    const { day, midnight, noon, tomorrow } = getTodaySlots(now);
    const slots = this.getSlots(addr);

    let slot: "00:00" | "12:00" | null = null;
    if (now >= noon) slot = "12:00";
    else if (now >= midnight) slot = "00:00";

    const already = slot === "00:00" ? slots.s00 : slot === "12:00" ? slots.s12 : true;
    if (!slot || already) {
      return { success: false, reason: "not-claimable" };
    }

    // Mark claimed
    if (slot === "00:00") slots.s00 = true;
    if (slot === "12:00") slots.s12 = true;
    
    this.saveSlots(addr, slots);
    
    const claimsToday = (slots.s00 ? 1 : 0) + (slots.s12 ? 1 : 0);
    let next: Date;
    if (now < midnight) next = midnight;
    else if (now < noon) next = noon;
    else next = new Date(tomorrow);

    const payout = { bgp: 200, usdt: 0.5 };

    return {
      success: true,
      slot,
      payout,
      next: next.getTime(),
      claimsToday,
    };
  }
}

export const airdropManager = new AirdropManager();