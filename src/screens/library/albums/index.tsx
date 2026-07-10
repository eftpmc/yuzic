import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useAlbums } from '@/hooks/albums'
import { selectAlbumLastPlayedAt, selectAlbumPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import type { LibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import CategoryListScreen from '@/screens/library/components/CategoryListScreen'
import AlbumItem from '@/screens/library/components/Items/AlbumItem'
import type { AlbumBase } from '@/types'

const SORT_OPTIONS: LibrarySortOrder[] = ['recentlyAdded', 'recent', 'title', 'year', 'userplays']

export default function AlbumsScreen() {
  const { t } = useTranslation()
  const { albums } = useAlbums()
  const lastPlayed = useSelector(selectAlbumLastPlayedAt)
  const playCounts = useSelector(selectAlbumPlayCounts)

  const getId = useCallback((a: AlbumBase) => a.id, [])
  const getTitle = useCallback((a: AlbumBase) => a.title, [])
  const getYear = useCallback((a: AlbumBase) => a.year, [])
  const getLastPlayedMs = useCallback((a: AlbumBase) => lastPlayed[a.id] ?? 0, [lastPlayed])
  const getPlayCount = useCallback((a: AlbumBase) => playCounts[a.id] ?? 0, [playCounts])
  const getCreatedMs = useCallback((a: AlbumBase) => a.created ? new Date(a.created).getTime() : 0, [])

  const renderItem = useCallback((album: AlbumBase, gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }) => (
    <AlbumItem album={album} {...gridProps} />
  ), [])

  return (
    <CategoryListScreen<AlbumBase>
      category="albums"
      title={t('library.categories.albums')}
      items={albums}
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
