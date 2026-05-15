import { useSelector } from 'react-redux'
import { useIsOffline } from '@/hooks/useIsOffline'
import {
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
  selectDeezerExternalScreensEnabled,
} from '@/utils/redux/selectors/settingsSelectors'

function useDeezerBase(selector: (s: any) => boolean): boolean {
  const enabled = useSelector(selector)
  const isOffline = useIsOffline()
  return enabled && !isOffline
}

export function useDeezerDiscoveryEnabled(): boolean {
  return useDeezerBase(selectDeezerDiscoveryEnabled)
}

export function useDeezerSearchEnabled(): boolean {
  return useDeezerBase(selectDeezerSearchEnabled)
}

export function useDeezerExternalScreensEnabled(): boolean {
  return useDeezerBase(selectDeezerExternalScreensEnabled)
}
