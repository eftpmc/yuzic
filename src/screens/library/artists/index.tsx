import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useArtists } from '@/hooks/artists'
import { selectArtistLastPlayedAt, selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import type { LibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import CategoryListScreen from '@/screens/library/components/CategoryListScreen'
import ArtistItem from '@/screens/library/components/Items/ArtistItem'
import type { Artist } from '@/types'

const SORT_OPTIONS: LibrarySortOrder[] = ['recent', 'title', 'userplays']

export default function ArtistsScreen() {
  const { t } = useTranslation()
  const { artists } = useArtists()
  const lastPlayed = useSelector(selectArtistLastPlayedAt)
  const playCounts = useSelector(selectArtistPlayCounts)

  const getId = useCallback((a: Artist) => a.id, [])
  const getTitle = useCallback((a: Artist) => a.name, [])
  const getLastPlayedMs = useCallback((a: Artist) => lastPlayed[a.id] ?? 0, [lastPlayed])
  const getPlayCount = useCallback((a: Artist) => playCounts[a.id] ?? 0, [playCounts])

  const renderItem = useCallback((artist: Artist, gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }) => (
    <ArtistItem
      artist={artist}
      id={artist.id}
      name={artist.name}
      subtext={artist.subtext}
      cover={artist.cover}
      {...gridProps}
    />
  ), [])

  return (
    <CategoryListScreen<Artist>
      category="artists"
      title={t('library.categories.artists')}
      items={artists}
      getId={getId}
      getTitle={getTitle}
      getLastPlayedMs={getLastPlayedMs}
      getPlayCount={getPlayCount}
      sortOptions={SORT_OPTIONS}
      renderItem={renderItem}
    />
  )
}
