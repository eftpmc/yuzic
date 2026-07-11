import { useEffect, useState } from 'react';

// Ticks every `intervalMs` while `active` is true, so an effect elsewhere can
// re-run periodically without needing its own timer wiring. No-ops (no
// interval running) while inactive.
export function usePollWhile(active: boolean, intervalMs: number): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(interval);
  }, [active, intervalMs]);

  return tick;
}
