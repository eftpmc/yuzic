import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useDownload } from '@/contexts/DownloadContext'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import { buildGenreRows } from '@/utils/library/genreList'

export type LibraryCounts = Record<
  'playlists' | 'albums' | 'artists' | 'tracks' | 'genres' | 'downloaded',
  number
>

/**
 * How much sits behind each library entry point. Shown on the rows so the
 * index says something about the library rather than just listing its types.
 */
export function useLibraryCounts(): LibraryCounts {
  const { albums } = useAlbums()
  const { artists } = useArtists()
  const { playlists } = usePlaylists()
  const { tracks } = useTracks()
  const { getAllDownloadedCollections } = useDownload()
  const genres = useSelector(selectLibraryGenres)

  return useMemo(() => ({
    playlists: playlists.length,
    albums: albums.length,
    artists: artists.length,
    tracks: tracks.length,
    // Counted the same way the genres screen counts them, so the number on the
    // row matches the list it opens.
    genres: buildGenreRows(genres, albums).length,
    downloaded: getAllDownloadedCollections().length,
  }), [albums, artists, playlists, tracks, genres, getAllDownloadedCollections])
}
