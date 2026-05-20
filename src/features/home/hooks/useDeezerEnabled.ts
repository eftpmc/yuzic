import { useSelector } from 'react-redux'
import { useIsOffline } from '@/hooks/useIsOffline'
import {
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
  selectDeezerTopTracksEnabled,
  selectDeezerSimilarArtistsEnabled,
  selectDeezerAlbumRecommendationsEnabled,
  selectDeezerSamplesEnabled,
  selectDeezerPlaylistRecommendationsEnabled,
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

export function useDeezerTopTracksEnabled(): boolean {
  return useDeezerBase(selectDeezerTopTracksEnabled)
}

export function useDeezerSimilarArtistsEnabled(): boolean {
  return useDeezerBase(selectDeezerSimilarArtistsEnabled)
}

export function useDeezerAlbumRecommendationsEnabled(): boolean {
  return useDeezerBase(selectDeezerAlbumRecommendationsEnabled)
}

export function useDeezerSamplesEnabled(): boolean {
  return useDeezerBase(selectDeezerSamplesEnabled)
}

export function useDeezerPlaylistRecommendationsEnabled(): boolean {
  return useDeezerBase(selectDeezerPlaylistRecommendationsEnabled)
}
