import { useSelector } from 'react-redux'
import { useIsOffline } from '@/hooks/useIsOffline'
import {
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
} from '@/utils/redux/selectors/settingsSelectors'
import { RootState } from '@/utils/redux/store'

function useDeezerBase(selector: (s: RootState) => boolean): boolean {
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
