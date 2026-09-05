import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  runOnJS,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';

/**
 * Where the player is between the playing bar and the full screen.
 *
 * `0` is the bar in the dock, `1` is the full-screen player, and every value
 * between is a real position the user's finger can hold it at — which is the
 * whole point of owning this rather than presenting a modal. One shared value
 * drives the surface rising, the bar's contents fading out, the player's
 * fading in, and the cover art travelling between the two.
 */

/** A square of cover art, in window coordinates. */
export type CoverRect = { x: number; y: number; size: number };

export const EMPTY_COVER_RECT: CoverRect = { x: 0, y: 0, size: 0 };

/**
 * Snappy enough to feel like it is following the finger that let go, soft
 * enough not to ring. Shared by every path that lets go of the player — tap,
 * flick, and the close button — so they all land the same way.
 */
export const PLAYER_SPRING: WithSpringConfig = {
  damping: 24,
  stiffness: 240,
  mass: 0.85,
  overshootClamping: false,
};

/** Below this the player counts as closed: the bar owns its own cover again
 *  and the host stops taking touches. Not exactly zero, so a spring settling
 *  through 0.0001 doesn't flicker the handover. */
export const CLOSED_EPSILON = 0.001;

/**
 * Whether the host has taken the cover over from the bar.
 *
 * Both ends of the handover have to agree about this exactly, and they used to
 * decide it separately: the bar dropped its thumbnail as soon as `expansion`
 * left zero, while the host would only draw the travelling cover once *both*
 * slots had been measured. On the very first drag the player screen has only
 * just been mounted by `prepare`, so its slot is still unmeasured for a frame
 * or two — and in that window the bar had already let go of a cover the host
 * could not yet draw, leaving the artwork missing at the exact moment the
 * gesture starts. One worklet, read by both sides, so there is no window.
 */
export function coverHandedOver(
  expansion: number,
  bar: CoverRect,
  full: CoverRect,
): boolean {
  'worklet';
  return expansion > CLOSED_EPSILON && bar.size > 0 && full.size > 0;
}

type PlayerExpansionValue = {
  /** 0 = collapsed to the bar, 1 = full screen. */
  expansion: SharedValue<number>;
  /** Where the bar draws its thumbnail, measured in window coordinates. */
  barCover: SharedValue<CoverRect>;
  /** Where the full player draws its cover, measured in window coordinates. */
  fullCover: SharedValue<CoverRect>;
  /** How far the full player's scroll view is from its top. The drag-to-collapse
   *  gesture reads this to know whether the finger should move the player or
   *  the list under it. */
  scrollY: SharedValue<number>;
  expand: () => void;
  collapse: () => void;
  /** True from the moment the player starts opening until it is fully closed.
   *  Drives hit-testing and the hardware back handler, both of which are JS. */
  isOpen: boolean;
  /** True once the player has been opened at all. The screen is built on
   *  first use and kept, rather than built for everyone who never opens it. */
  hasOpened: boolean;
  /** Build the player screen now, without opening it — called as a drag on the
   *  bar begins, so the tree is ready by the time the finger has moved. */
  prepare: () => void;
};

const PlayerExpansionContext = createContext<PlayerExpansionValue | undefined>(undefined);

export const usePlayerExpansion = (): PlayerExpansionValue => {
  const ctx = useContext(PlayerExpansionContext);
  if (!ctx) throw new Error('usePlayerExpansion must be used within PlayerExpansionProvider');
  return ctx;
};

export const PlayerExpansionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const expansion = useSharedValue(0);
  const barCover = useSharedValue<CoverRect>(EMPTY_COVER_RECT);
  const fullCover = useSharedValue<CoverRect>(EMPTY_COVER_RECT);
  const scrollY = useSharedValue(0);

  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  // One place decides what "open" means, so a tap, a drag that never
  // completed, and a spring settling back to zero all agree about it.
  useAnimatedReaction(
    () => expansion.value > CLOSED_EPSILON,
    (open, wasOpen) => {
      if (open !== wasOpen) runOnJS(setIsOpen)(open);
    },
    [],
  );

  const prepare = useCallback(() => setHasOpened(true), []);

  const expand = useCallback(() => {
    setHasOpened(true);
    setIsOpen(true);
    expansion.value = withSpring(1, PLAYER_SPRING);
  }, [expansion]);

  const collapse = useCallback(() => {
    expansion.value = withSpring(0, PLAYER_SPRING);
  }, [expansion]);

  const value = useMemo<PlayerExpansionValue>(
    () => ({
      expansion,
      barCover,
      fullCover,
      scrollY,
      expand,
      collapse,
      isOpen,
      hasOpened,
      prepare,
    }),
    [expansion, barCover, fullCover, scrollY, expand, collapse, isOpen, hasOpened, prepare],
  );

  return (
    <PlayerExpansionContext.Provider value={value}>
      {children}
    </PlayerExpansionContext.Provider>
  );
};
