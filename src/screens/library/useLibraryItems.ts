import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useDownload } from '@/contexts/DownloadContext'
import {
  selectSongLastPlayedAt,
  selectSongPlayCounts,
  selectAlbumLastPlayedAt,
  selectAlbumPlayCounts,
  selectArtistLastPlayedAt,
  selectArtistPlayCounts,
} from '@/utils/redux/selectors/statsSelectors'
import {
  EMPTY_SORT_STATS,
  sortItems,
  usesPlayStats,
  type LibraryCollectionType,
  type LibraryItem,
  type SortOrder,
  type SortStats,
} from './librarySort'

/**
 * The library list for one entity type, or the mixed list when given none.
 *
 * Shared by the library tab and the per-type screens so both read the same
 * data and order it the same way.
 */
export function useLibraryItems(
  type: LibraryCollectionType | null,
  sortOrder: SortOrder
): LibraryItem[] {
  const songLastPlayed = useSelector(selectSongLastPlayedAt)
  const songPlays = useSelector(selectSongPlayCounts)
  const albumLastPlayed = useSelector(selectAlbumLastPlayedAt)
  const albumPlays = useSelector(selectAlbumPlayCounts)
  const artistLastPlayed = useSelector(selectArtistLastPlayedAt)
  const artistPlays = useSelector(selectArtistPlayCounts)

  const { albums } = useAlbums()
  const { artists } = useArtists()
  const { playlists } = usePlaylists()
  const { tracks } = useTracks()
  const { getAllDownloadedCollections } = useDownload()

  const stats = useMemo<SortStats>(
    () => ({ songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays }),
    [songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays],
  )

  // Orders that ignore play data get the stable empty constant, so the list
  // doesn't recompute every time a song is played.
  const statsForSort = usesPlayStats(sortOrder) ? stats : EMPTY_SORT_STATS

  const downloadedCollectionIds = useMemo(() => {
    const ids = new Set<string>()
    getAllDownloadedCollections().forEach(c => ids.add(c.id))
    return ids
  }, [getAllDownloadedCollections])

  return useMemo(() => {
    switch (type) {
      case 'playlists':
        return sortItems(playlists.map(p => ({ kind: 'playlist' as const, data: p })), sortOrder, statsForSort)
      case 'albums':
        return sortItems(albums.map(a => ({ kind: 'album' as const, data: a })), sortOrder, statsForSort)
      case 'artists':
        return sortItems(artists.map(a => ({ kind: 'artist' as const, data: a })), sortOrder, statsForSort)
      case 'tracks':
        return sortItems(tracks.map(tr => ({ kind: 'track' as const, data: tr })), sortOrder, statsForSort)
      case 'downloaded':
        return sortItems([
          ...albums.filter(a => downloadedCollectionIds.has(a.id)).map(a => ({ kind: 'album' as const, data: a })),
          ...playlists.filter(p => downloadedCollectionIds.has(p.id)).map(p => ({ kind: 'playlist' as const, data: p })),
        ], sortOrder, statsForSort)
      default:
        return sortItems([
          ...playlists.map(p => ({ kind: 'playlist' as const, data: p })),
          ...albums.map(a => ({ kind: 'album' as const, data: a })),
          ...artists.map(a => ({ kind: 'artist' as const, data: a })),
        ], sortOrder, statsForSort)
    }
  }, [type, sortOrder, statsForSort, albums, artists, playlists, tracks, downloadedCollectionIds])
}
