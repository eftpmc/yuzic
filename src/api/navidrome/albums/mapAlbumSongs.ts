import { Song, CoverSource } from '@/types';
import { makeLocalId } from '@/types/EntityId';
import type { NavidromeClient } from '../client';
import type { SubsonicAlbum } from '../types';

export function mapAlbumSongs(album: SubsonicAlbum, cover: CoverSource, client: NavidromeClient): Song[] {
  const sourceServerId = client.serverId;
  return (album.song ?? [])
    .filter((song): song is typeof song & { id: string } => !!song?.id)
    .map(song => ({
      id: song.id,
      title: song.title ?? 'Unknown',
      artist: song.artist ?? 'Unknown Artist',
      artistId: song.artistId ?? '',
      duration: String(song.duration ?? 0),
      cover,
      albumId: album.id ?? '',
      albumTitle: album.name,
      streamUrl: client.buildStreamUrl(song.id),
      filePath: song.path ?? undefined,
      bitrate: song.bitRate ?? undefined,
      sampleRate: song.samplingRate ?? undefined,
      bitsPerSample: song.bitDepth ?? undefined,
      mimeType: song.contentType ?? undefined,
      dateReleased: song.year != null ? String(song.year) : undefined,
      disc: song.discNumber ?? undefined,
      trackNumber: song.track ?? undefined,
      dateAdded: song.created ?? undefined,
      bpm: song.bpm ?? undefined,
      genres: Array.isArray(song.genres) && song.genres.length > 0
        ? song.genres.map(genre => typeof genre === 'string' ? genre : genre?.name).filter((genre): genre is string => !!genre)
        : song.genre ? [song.genre] : undefined,
      localId: sourceServerId ? makeLocalId({ kind: 'track', sourceServerId, serverItemId: song.id }) : undefined,
      libraryState: 'in-library',
    }));
}
