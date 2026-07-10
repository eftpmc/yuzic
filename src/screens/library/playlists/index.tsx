import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { usePlaylists } from '@/hooks/playlists'
import type { LibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import CategoryListScreen from '@/screens/library/components/CategoryListScreen'
import PlaylistItem from '@/screens/library/components/Items/PlaylistItem'
import type { PlaylistBase } from '@/types'

const SORT_OPTIONS: LibrarySortOrder[] = ['recent', 'recentlyAdded', 'title']

export default function PlaylistsScreen() {
  const { t } = useTranslation()
  const { playlists } = usePlaylists()

  const getId = useCallback((p: PlaylistBase) => p.id, [])
  const getTitle = useCallback((p: PlaylistBase) => p.title, [])
  const getLastPlayedMs = useCallback((p: PlaylistBase) => p.changed ? new Date(p.changed).getTime() : 0, [])
  const getCreatedMs = useCallback((p: PlaylistBase) => p.created ? new Date(p.created).getTime() : 0, [])

  const renderItem = useCallback((playlist: PlaylistBase, gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }) => (
    <PlaylistItem
      playlist={playlist}
      id={playlist.id}
      title={playlist.title}
      subtext={playlist.subtext}
      cover={playlist.cover}
      {...gridProps}
    />
  ), [])

  return (
    <CategoryListScreen<PlaylistBase>
      category="playlists"
      title={t('library.categories.playlists')}
      items={playlists}
      getId={getId}
      getTitle={getTitle}
      getLastPlayedMs={getLastPlayedMs}
      getCreatedMs={getCreatedMs}
      sortOptions={SORT_OPTIONS}
      renderItem={renderItem}
    />
  )
}
