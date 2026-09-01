import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Whether the app is in the foreground. Polling loops gate on this so they stop
 * issuing requests once the user leaves the app — on Android an interval keeps
 * firing indefinitely in the background, which is battery and data spent on a
 * screen nobody is looking at.
 */
export function useAppActive(): boolean {
  const [isActive, setIsActive] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const handle = (state: AppStateStatus) => setIsActive(state === 'active');
    // The state can change between the initial render and this subscription.
    handle(AppState.currentState);
    const subscription = AppState.addEventListener('change', handle);
    return () => subscription.remove();
  }, []);

  return isActive;
}
