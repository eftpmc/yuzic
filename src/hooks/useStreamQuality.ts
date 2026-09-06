import { useSelector } from 'react-redux';

import { useNetworkType } from './useNetworkType';
import {
  selectWifiStreamQuality,
  selectCellularStreamQuality,
} from '@/utils/redux/selectors/settingsSelectors';
import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';

/**
 * The quality to ask the server for right now.
 *
 * Two settings, picked between by the connection: the user chooses Original on
 * WiFi and something smaller on cellular precisely so the app spends their data
 * the way they asked. `'high'` is the fallback for an unknown connection — the
 * same value the app used before either setting existed.
 *
 * This lives in a hook because it was previously derived inside PlayingContext
 * and nowhere else, which meant CarPlay — the one other place that builds a
 * stream URL — hardcoded `'high'` and quietly ignored the setting.
 */
export function useStreamQuality(): AudioQuality {
  const networkType = useNetworkType();
  const wifiQuality = useSelector(selectWifiStreamQuality);
  const cellularQuality = useSelector(selectCellularStreamQuality);

  return networkType === 'wifi' ? wifiQuality
    : networkType === 'cellular' ? cellularQuality
    : 'high';
}
