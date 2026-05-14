import { useIsOffline } from '@/hooks/useIsOffline'
import { usePersistedActiveSource } from './usePersistedActiveSource'

export function useDeezerEnabled(): boolean {
  const { activeSource } = usePersistedActiveSource()
  const isOffline = useIsOffline()
  return activeSource === 'deezer' && !isOffline
}
