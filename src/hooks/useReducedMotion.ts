import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSelector } from 'react-redux';

import { selectRespectReducedMotion } from '@/utils/redux/selectors/settingsSelectors';

/**
 * True when animations should be softened — either because the OS reports the
 * user has enabled a reduce-motion preference and yuzic is respecting it
 * (default), or because the user has manually forced it in Appearance.
 *
 * Not "no motion" — a fade or opacity change is still fine, but a spring or a
 * translate should collapse to a short timing (or a no-op). Callers gate the
 * expensive interaction rather than remove the visual entirely.
 *
 * Subscribes to `AccessibilityInfo` for live changes so the app reacts when
 * the setting is toggled in Settings without a restart.
 */
export function useReducedMotion(): boolean {
  const respect = useSelector(selectRespectReducedMotion);
  const [systemPrefers, setSystemPrefers] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (mounted) setSystemPrefers(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      setSystemPrefers(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return respect && systemPrefers;
}
