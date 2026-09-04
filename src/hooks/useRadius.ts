import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { radius, scaleRadius, type RadiusPreset } from '@/constants/design';
import { selectRadiusPreset } from '@/utils/redux/selectors/settingsSelectors';

/**
 * Live radius values scaled by the user's preset.
 *
 * Consumers of the shape-defining tokens (`md`/`card`/`lg`/`panel`/`pill`)
 * should read them here so a preset change re-renders them with new corners.
 * Truly structural nudges (`xs`/`sm`/`thumb`) stay imported from
 * `constants/design` — they're too small to be worth flipping.
 *
 * Under `default` these are the same numbers as the static `radius` export,
 * so a component migrating to the hook doesn't visually change until the user
 * picks a different preset.
 */
export type ScaledRadius = {
  md: number;
  card: number;
  lg: number;
  panel: number;
  pill: number;
};

export function useRadius(): ScaledRadius {
  const preset = useSelector(selectRadiusPreset) as RadiusPreset;
  return useMemo(
    () => ({
      md: scaleRadius(radius.md, preset),
      card: scaleRadius(radius.card, preset),
      lg: scaleRadius(radius.lg, preset),
      panel: scaleRadius(radius.panel, preset),
      pill: scaleRadius(radius.pill, preset),
    }),
    [preset],
  );
}
