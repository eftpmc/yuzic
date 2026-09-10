/**
 * Where a drag on the player lands when the finger lets go.
 *
 * Pure so the thresholds can be tested without a gesture, a player, or a
 * device — the same reason `screens/playing/coverSwipe.ts` and
 * `features/theme`'s `pickAccent` are pure.
 *
 * There are two of these rather than one because opening and closing are
 * deliberately asymmetric: a short flick up opens the player, while closing it
 * takes either a quarter of the screen or a decisive throw. The player is the
 * thing you asked for; it should not fall out of your hand.
 *
 * Both answer `0` or `1` and nothing between. That is the point: **every** exit
 * from a drag has to name an end. The bug this file exists to prevent is an
 * exit that names nothing — `dragToClose.onEnd` used to `return` early when the
 * player was fully open, so an interrupted gesture left `expansion` parked
 * wherever it stood. The playing bar fades itself out by `expansion`, so a
 * value stuck at 0.3 drew the bar fully transparent while it was still mounted,
 * still holding its slot, and still counted as "open" by `CLOSED_EPSILON` —
 * the mini player simply vanished with the music still playing (#211).
 */

/** Fraction of the screen an upward drag must cross to count as opening. */
export const OPEN_AT = 0.3;

/** Upward points per second past which a flick opens however short it was. */
export const OPEN_VELOCITY = -700;

/**
 * How much of the drag *back* down is needed to stay open. Deliberately high:
 * once the player is up, anything that looks like a dismissal is one.
 */
export const CLOSE_BELOW = 0.75;

/** Downward points per second past which a throw closes however short it was. */
export const CLOSE_VELOCITY = 700;

/** Fully collapsed, fully open — never anything else. */
export type Settled = 0 | 1;

/**
 * Where the player lands when a gesture that never actually moved it ends.
 *
 * A pan on the open player is a sibling of the scroll view's own gesture, so
 * most of them are scrolls: the finger moves, the list moves, and `expansion`
 * is never written. Such a gesture has decided nothing, so it must not be
 * allowed to *look* like a decision — but it still has to name an end, because
 * "leave it where it is" is exactly how a value gets stuck. Nearest end, which
 * for an open player being scrolled is the one it is already at.
 */
function nearestEnd(expansion: number): Settled {
  'worklet';
  return expansion >= 0.5 ? 1 : 0;
}

/**
 * Dragging up from the playing bar.
 *
 * @param moved whether the gesture ever wrote `expansion` at all.
 */
export function settleFromBar(
  expansion: number,
  velocityY: number,
  moved: boolean,
): Settled {
  // Runs inside a gesture callback, which is on the UI thread. Without this the
  // call throws `Tried to synchronously call a non-worklet function` at the end
  // of the first drag — invisible to typecheck, lint and jest, all of which run
  // it happily on the JS thread.
  'worklet';
  if (!moved) return nearestEnd(expansion);
  if (velocityY < OPEN_VELOCITY) return 1;
  return expansion > OPEN_AT ? 1 : 0;
}

/**
 * Dragging down on the open player.
 *
 * @param moved whether the gesture ever wrote `expansion` at all — false for
 *   the scrolls, which are most of them.
 */
export function settleFromPlayer(
  expansion: number,
  velocityY: number,
  moved: boolean,
): Settled {
  'worklet';
  if (!moved) return nearestEnd(expansion);
  if (velocityY > CLOSE_VELOCITY) return 0;
  return expansion < CLOSE_BELOW ? 0 : 1;
}
