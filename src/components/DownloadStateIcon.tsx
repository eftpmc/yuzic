import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Check, Download } from 'lucide-react-native';
import DownloadProgressRing from '@/components/DownloadProgressRing';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { iconSize } from '@/constants/design';

type Props = {
  isDownloaded: boolean;
  isDownloading: boolean;
  /**
   * Aggregate progress in [0, 1]. Omit where the surface cannot measure it —
   * an indeterminate spinner is drawn instead of a ring that would have to
   * invent a number.
   */
  progress?: number;
  color: string;
  size?: number;
};

/** Overshoot and settle. The moment the download lands is worth marking. */
const POP_IN = { damping: 8, stiffness: 200 };
const POP_SETTLE = { damping: 10, stiffness: 200 };

/**
 * The download control's three states, in one place.
 *
 * This was written out separately on all four detail headers and had drifted
 * into three different behaviours: album popped the checkmark in, playlist
 * drew the same tick with no animation at all, and genre and artist showed an
 * indeterminate spinner where the other two showed a determinate ring. Nothing
 * about a genre makes its download less measurable — the progress was simply
 * never passed. A user downloading an album and then a playlist saw the app
 * congratulate itself once and stay silent the second time.
 *
 * Mounting already-downloaded is not an arrival, so the checkmark is only
 * animated when `isDownloaded` becomes true while mounted. Revisiting a
 * downloaded album would otherwise pop a tick for something that finished
 * days ago.
 */
export default function DownloadStateIcon({
  isDownloaded,
  isDownloading,
  progress,
  color,
  size = iconSize.row,
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(isDownloaded ? 1 : 0);

  useEffect(() => {
    if (!isDownloaded) {
      scale.value = 0;
      return;
    }
    // Already at rest: this is a mount in the downloaded state, not an
    // arrival, so there is nothing to announce.
    if (scale.value === 1) return;
    scale.value = reduced ? 1 : withSequence(withSpring(1.2, POP_IN), withSpring(1, POP_SETTLE));
  }, [isDownloaded, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (isDownloading) {
    return progress === undefined ? (
      <SpinningLoaderCircle size={size} color={color} />
    ) : (
      <DownloadProgressRing progress={progress} size={size} color={color} />
    );
  }

  if (isDownloaded) {
    return (
      <Animated.View style={style}>
        <Check size={size} color={color} />
      </Animated.View>
    );
  }

  return <Download size={size} color={color} />;
}
