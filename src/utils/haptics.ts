import * as Haptics from 'expo-haptics';

import store from '@/utils/redux/store';
import { selectHapticsEnabled } from '@/utils/redux/selectors/settingsSelectors';

/**
 * A thin wrapper around expo-haptics that reads the user's opt-out from Redux
 * synchronously so callers stay one-line — `haptics.tap()` inside a press
 * handler, no context or hook wiring. Every helper is fire-and-forget: the
 * native calls resolve asynchronously and are swallowed so a failure on the
 * bridge never breaks the surrounding action.
 *
 * Kept out of hook-land on purpose. These fire from event handlers, effects,
 * and the download background loop, where subscribing to Redux is either
 * awkward or wrong. `store.getState()` is safe here because the settings
 * slice is already rehydrated by the time anything can call these.
 */

function enabled(): boolean {
  try {
    return selectHapticsEnabled(store.getState());
  } catch {
    return true;
  }
}

function fire(fn: () => Promise<unknown>): void {
  if (!enabled()) return;
  // Fire-and-forget; swallow rejections. A missing native module or platform
  // that doesn't support haptics (older devices, some Androids) should never
  // break the surrounding button press.
  fn().catch(() => {});
}

/** Feather-light bump — the everyday tap on a menu item, a chip, a toggle. */
export function tap(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A firmer tick — play/pause, skip, primary action inside a screen. */
export function primary(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Weighty confirmation — long-press activation, sheet opening on a hold. */
export function heavy(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** A completed action — download finished, playlist created, favourite added. */
export function success(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Something went wrong the user should feel — failed to enqueue, playback error. */
export function warning(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function error(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Small change in a two-state control — favourite on/off, shuffle on/off. */
export function selection(): void {
  fire(() => Haptics.selectionAsync());
}

const haptics = { tap, primary, heavy, success, warning, error, selection };
export default haptics;
