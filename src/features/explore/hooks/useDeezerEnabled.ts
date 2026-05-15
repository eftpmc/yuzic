import { useSelector } from 'react-redux'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectDeezerEnabled } from '@/utils/redux/selectors/settingsSelectors'

export function useDeezerEnabled(): boolean {
  const enabled = useSelector(selectDeezerEnabled)
  const isOffline = useIsOffline()
  return enabled && !isOffline
}
