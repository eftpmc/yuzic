export type RepeatMode = 'off' | 'all' | 'one';
export type BackendRepeatMode = 'off' | 'queue' | 'track';

export function nextRepeatMode(mode: RepeatMode): RepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}

export function backendRepeatMode(mode: RepeatMode): BackendRepeatMode {
  return mode === 'all' ? 'queue' : mode === 'one' ? 'track' : 'off';
}

export function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function seekTarget(position: number, delta: number, duration: number): number {
  const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(max, (position || 0) + delta));
}

export function movedCurrentIndex(current: number, from: number, to: number): number {
  if (current === from) return to;
  if (from < current && to >= current) return current - 1;
  if (from > current && to <= current) return current + 1;
  return current;
}
