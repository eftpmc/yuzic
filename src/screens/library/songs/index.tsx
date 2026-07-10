import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useTracks } from '@/hooks/tracks'
import { selectSongLastPlayedAt, selectSongPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import type { LibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import CategoryListScreen from '@/screens/library/components/CategoryListScreen'
import TrackItem from '@/screens/library/components/Items/TrackItem'
import type { SongBase } from '@/types'

const SORT_OPTIONS: LibrarySortOrder[] = ['recentlyAdded', 'recent', 'title', 'year', 'userplays']

export default function SongsScreen() {
  const { t } = useTranslation()
  const { tracks } = useTracks()
  const lastPlayed = useSelector(selectSongLastPlayedAt)
  const playCounts = useSelector(selectSongPlayCounts)

  const getId = useCallback((s: SongBase) => s.id, [])
  const getTitle = useCallback((s: SongBase) => s.title, [])
  const getYear = useCallback((s: SongBase) => s.year, [])
  const getLastPlayedMs = useCallback((s: SongBase) => lastPlayed[s.id] ?? 0, [lastPlayed])
  const getPlayCount = useCallback((s: SongBase) => playCounts[s.id] ?? 0, [playCounts])
  const getCreatedMs = useCallback((s: SongBase) => s.dateAdded ? new Date(s.dateAdded).getTime() : 0, [])

  const renderItem = useCallback((song: SongBase, gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }) => (
    <TrackItem song={song} {...gridProps} />
  ), [])

  return (
    <CategoryListScreen<SongBase>
      category="songs"
      title={t('library.categories.songs')}
      items={tracks}
      getId={getId}
      getTitle={getTitle}
      getYear={getYear}
      getLastPlayedMs={getLastPlayedMs}
      getPlayCount={getPlayCount}
      getCreatedMs={getCreatedMs}
      sortOptions={SORT_OPTIONS}
      renderItem={renderItem}
    />
  )
}
