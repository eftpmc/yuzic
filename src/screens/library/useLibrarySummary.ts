import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useDownload } from '@/contexts/DownloadContext'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import { buildGenreRows } from '@/utils/library/genreList'
import type { CoverSource } from '@/types'

export type LibraryEntryKey =
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'tracks'
  | 'genres'
  | 'downloaded'
  | 'radio'

export type LibraryEntrySummary = {
  /** How much sits behind the entry point. */
  count?: number
  /** Art for the row, most-representative first. Fewer than `MOSAIC_COVERS`
   * where the library doesn't have that many with art on them. */
  covers: CoverSource[]
}

/** A mosaic is four covers or it is one — three-quarters of a grid reads as a
 * loading state rather than a design. */
export const MOSAIC_COVERS = 4

/**
 * Whether a cover will actually resolve to a picture.
 *
 * A letter tile or an empty cover is the fallback the row already has, drawn
 * smaller and four times over, so it is worth nothing here.
 */
function hasArt(cover: CoverSource | undefined): cover is CoverSource {
  return !!cover && cover.kind !== 'none' && cover.kind !== 'letter'
}

function coversOf(items: { cover: CoverSource }[]): CoverSource[] {
  const covers: CoverSource[] = []
  for (const item of items) {
    if (!hasArt(item.cover)) continue
    covers.push(item.cover)
    if (covers.length === MOSAIC_COVERS) break
  }
  return covers
}

/**
 * What each library entry point holds, and what it looks like.
 *
 * The index used to be seven identical grey icon wells over a screen of empty
 * black, which said nothing about the library behind them — the same screen
 * whether you owned four albums or six hundred. The counts and the covers are
 * the part that is actually about *your* library, so both are read here, from
 * one place, off the data the rows already needed.
 */
export function useLibrarySummary(): Record<LibraryEntryKey, LibraryEntrySummary> {
  const { albums } = useAlbums()
  const { artists } = useArtists()
  const { playlists } = usePlaylists()
  const { tracks } = useTracks()
  const { getAllDownloadedCollections } = useDownload()
  const genres = useSelector(selectLibraryGenres)

  return useMemo(() => {
    const genreRows = buildGenreRows(genres, albums)

    // One album per genre, in the order the genres screen lists them, so the
    // row's art is the art of the screen it opens.
    const genreCovers: CoverSource[] = []
    for (const row of genreRows) {
      const album = albums.find(
        a => a.genres?.includes(row.genre) && hasArt(a.cover)
      )
      if (album) genreCovers.push(album.cover)
      if (genreCovers.length === MOSAIC_COVERS) break
    }

    // Counted the way the downloaded screen builds its list, so the number on
    // the row matches what opening it shows — a collection whose album has
    // since left the library is not on that screen either.
    const downloadedIds = new Set(getAllDownloadedCollections().map(c => c.id))
    const downloaded = [
      ...albums.filter(a => downloadedIds.has(a.id)),
      ...playlists.filter(p => downloadedIds.has(p.id)),
    ]

    // Deduped by album, or four songs off one record give four copies of the
    // same square.
    const seenAlbums = new Set<string>()
    const trackCovers: CoverSource[] = []
    for (const track of tracks) {
      const key = track.albumId || track.id
      if (seenAlbums.has(key) || !hasArt(track.cover)) continue
      seenAlbums.add(key)
      trackCovers.push(track.cover)
      if (trackCovers.length === MOSAIC_COVERS) break
    }

    return {
      playlists: { count: playlists.length, covers: coversOf(playlists) },
      albums: { count: albums.length, covers: coversOf(albums) },
      artists: { count: artists.length, covers: coversOf(artists) },
      tracks: { count: tracks.length, covers: trackCovers },
      genres: { count: genreRows.length, covers: genreCovers },
      downloaded: { count: downloaded.length, covers: coversOf(downloaded) },
      // Radio has no count summary here — the list lives on the server, and
      // fetching it just to say "3 stations" on a row people don't click yet
      // isn't worth the request. The screen itself fetches on open.
      radio: { count: undefined, covers: [] },
    }
  }, [albums, artists, playlists, tracks, genres, getAllDownloadedCollections])
}
