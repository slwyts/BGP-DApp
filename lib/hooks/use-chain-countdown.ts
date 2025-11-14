"use client";

import { useEffect, useMemo, useState } from "react";

type UseChainCountdownOptions = {
  nextSlotTime?: number;
  canInteract?: boolean;
  blockTimestamp?: number;
  enabled?: boolean;
};

/**
 * Provides a stable countdown (in seconds) to the next slot using
 * the on-chain timestamp to cancel out local clock drift.
 */
export function useChainCountdown({
  nextSlotTime,
  canInteract,
  blockTimestamp,
  enabled = true,
}: UseChainCountdownOptions) {
  const [chainOffset, setChainOffset] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Track the drift between local time and on-chain time (ms)
  useEffect(() => {
    if (typeof blockTimestamp === "number") {
      setChainOffset(blockTimestamp * 1000 - Date.now());
    }
  }, [blockTimestamp]);

  const targetTime = useMemo(() => {
    if (!enabled || !nextSlotTime) {
      return null;
    }
    // 移除 canInteract 的判断，让倒计时自然归零
    return nextSlotTime * 1000 - chainOffset;
  }, [enabled, nextSlotTime, chainOffset]);

  useEffect(() => {
    if (!targetTime) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const diffMs = targetTime - Date.now();
      const seconds = Math.max(0, Math.round(diffMs / 1000));
      setRemainingSeconds(seconds);
      
      // 如果倒计时到0且 canInteract 还是 false，说明状态还没更新，保持在0
      if (seconds === 0 && !canInteract) {
        setRemainingSeconds(0);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime, canInteract]);

  return remainingSeconds;
}
