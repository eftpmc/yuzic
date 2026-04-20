import { CoverSource, Song } from '@/types'
import type { EmbyClient } from '../client'
import { normalizeGenres } from '../utils/normalizeGenres'

export type GetSongsByGenreResult = Song[]

async function fetchAlbumsByGenre(client: EmbyClient, genre: string) {
  const path =
    `/Items` +
    `?IncludeItemTypes=MusicAlbum` +
    `&Genres=${encodeURIComponent(genre)}` +
    `&Recursive=true`
  return client.request<any>(path)
}

async function fetchSongsForAlbum(client: EmbyClient, albumId: string) {
  const path =
    `/Items` +
    `?ParentId=${albumId}` +
    `&IncludeItemTypes=Audio` +
    `&Fields=MediaSources,RunTimeTicks,Genres,Album,AlbumArtist,Artists,UserData,PlayCount`
  return client.request<any>(path)
}

function normalizeGenreSongEntry(s: any, client: EmbyClient): Song {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0

  const cover: CoverSource = (s.AlbumId && s.AlbumPrimaryImageTag)
    ? { kind: 'emby', itemId: s.AlbumId, tag: s.AlbumPrimaryImageTag }
    : { kind: 'none' }

  const ms = s.MediaSources?.[0]
  const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === 'Audio')

  return {
    id: s.Id,
    title: s.Name,
    artist: s.ArtistItems?.[0]?.Name ?? 'Unknown Artist',
    artistId: s.ArtistItems?.[0]?.Id ?? '',
    cover,
    duration: String(
      Math.round(Number(ticks) / 10_000_000)
    ),
    streamUrl: client.buildStreamUrl(s.Id),
    albumId: s.AlbumId ?? '',
    bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
    sampleRate: audioStream?.SampleRate ?? undefined,
    bitsPerSample: audioStream?.BitDepth ?? undefined,
    mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
    dateReleased: s.PremiereDate ?? undefined,
    disc: s.ParentIndexNumber ?? undefined,
    trackNumber: s.IndexNumber ?? undefined,
    dateAdded: s.DateCreated ?? undefined,
    genres: normalizeGenres(s.Genres),
  }
}

export async function getSongsByGenre(
  client: EmbyClient,
  genre: string
): Promise<GetSongsByGenreResult> {
  const albumRes = await fetchAlbumsByGenre(client, genre)
  const albums = albumRes?.Items ?? []
  if (!albums.length) return []

  const songResults = await Promise.all(
    albums.map((album: any) =>
      fetchSongsForAlbum(client, album.Id)
        .then(res => res?.Items ?? [])
        .catch(() => [])
    )
  )

  const songs = songResults.flat()
  return songs.map(s => normalizeGenreSongEntry(s, client))
}
