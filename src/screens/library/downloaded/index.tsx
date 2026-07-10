import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useAlbums } from '@/hooks/albums'
import { usePlaylists } from '@/hooks/playlists'
import { useDownload } from '@/contexts/DownloadContext'
import type { LibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import CategoryListScreen from '@/screens/library/components/CategoryListScreen'
import AlbumItem from '@/screens/library/components/Items/AlbumItem'
import PlaylistItem from '@/screens/library/components/Items/PlaylistItem'
import type { AlbumBase, PlaylistBase } from '@/types'

const SORT_OPTIONS: LibrarySortOrder[] = ['title', 'recentlyAdded']

type DownloadedItem =
  | { kind: 'album'; data: AlbumBase }
  | { kind: 'playlist'; data: PlaylistBase }

export default function DownloadedScreen() {
  const { t } = useTranslation()
  const { albums } = useAlbums()
  const { playlists } = usePlaylists()
  const { getAllDownloadedCollections } = useDownload()

  const downloadedCollectionIds = useMemo(() => {
    const ids = new Set<string>()
    getAllDownloadedCollections().forEach(c => ids.add(c.id))
    return ids
  }, [getAllDownloadedCollections])

  const items = useMemo<DownloadedItem[]>(() => [
    ...albums.filter(a => downloadedCollectionIds.has(a.id)).map(a => ({ kind: 'album' as const, data: a })),
    ...playlists.filter(p => downloadedCollectionIds.has(p.id)).map(p => ({ kind: 'playlist' as const, data: p })),
  ], [albums, playlists, downloadedCollectionIds])

  const getId = useCallback((item: DownloadedItem) => `${item.kind}-${item.data.id}`, [])
  const getTitle = useCallback((item: DownloadedItem) => item.data.title, [])
  const getCreatedMs = useCallback(
    (item: DownloadedItem) => item.data.created ? new Date(item.data.created).getTime() : 0,
    []
  )

  const renderItem = useCallback((item: DownloadedItem, gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }) => {
    if (item.kind === 'album') {
      return <AlbumItem album={item.data} {...gridProps} />
    }
    return (
      <PlaylistItem
        playlist={item.data}
        id={item.data.id}
        title={item.data.title}
        subtext={item.data.subtext}
        cover={item.data.cover}
        {...gridProps}
      />
    )
  }, [])

  const getItemType = useCallback((item: DownloadedItem) => item.kind, [])

  return (
    <CategoryListScreen<DownloadedItem>
      category="downloaded"
      title={t('library.categories.downloaded')}
      items={items}
      getId={getId}
      getTitle={getTitle}
      getCreatedMs={getCreatedMs}
      sortOptions={SORT_OPTIONS}
      renderItem={renderItem}
      getItemType={getItemType}
    />
  )
}
