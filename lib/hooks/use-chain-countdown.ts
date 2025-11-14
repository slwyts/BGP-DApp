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
    if (!enabled || !nextSlotTime || canInteract) {
      return null;
    }
    return nextSlotTime * 1000 - chainOffset;
  }, [enabled, nextSlotTime, canInteract, chainOffset]);

  useEffect(() => {
    if (!targetTime) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const diffMs = targetTime - Date.now();
      setRemainingSeconds(Math.max(0, Math.round(diffMs / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return remainingSeconds;
}
