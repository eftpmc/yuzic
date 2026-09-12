import { useSelector } from 'react-redux';
import type { ApiAdapter } from '@/api/types';
import type { AudiomuseConfig } from '@/api/audiomuse/client';
import type { Album, Artist, Song } from '@/types';
import { generateSimilarPlaylist } from './generatePlaylist';
import { selectIsAudiomuseConfigured } from '@/utils/redux/selectors/audiomuseSelectors';

/**
 * Thin seed-derivation adapters over `generateSimilarPlaylist` for entities
 * that aren't a single track — the `playlist.generate` capability slot's
 * first cut is track/entity-seeded only (mood-centroid is deferred).
 *
 * Each derives a representative seed track from the entity (an album's
 * first track, an artist's first known track) and defers entirely to the
 * existing generator for the actual work: AudioMuse similarity, then
 * `api.playlists.create`/`addSong` on the media server. There is no
 * separate create-playlist implementation here and no Yuzic-local playlist
 * store — the provider writes the playlist server-side, same as the
 * track-seeded gesture in `SongOptions`.
 */

/** Derives a seed track from `album` and generates a playlist "Similar to <album>". */
export async function generateForAlbum(
  api: ApiAdapter,
  audiomuse: AudiomuseConfig,
  album: Album,
  opts: { size?: number } = {}
): Promise<{ playlistId: string; trackCount: number }> {
  const seed = album.songs[0];
  if (!seed) {
    throw new Error('Album has no tracks to seed a playlist from');
  }
  return generateSimilarPlaylist(api, audiomuse, seed, {
    size: opts.size,
    name: `Similar to ${album.title}`,
  });
}

/**
 * Derives a seed track from `artist`'s known songs and generates a playlist
 * "Similar to <artist>". `songs` is passed in rather than read off `artist`
 * because `Artist` doesn't carry a song list — callers already have it from
 * whatever lazily hydrated the artist's tracks (e.g. `useLazyArtistSongs`).
 */
export async function generateForArtist(
  api: ApiAdapter,
  audiomuse: AudiomuseConfig,
  artist: Artist,
  songs: Song[],
  opts: { size?: number } = {}
): Promise<{ playlistId: string; trackCount: number }> {
  const seed = songs[0];
  if (!seed) {
    throw new Error('Artist has no tracks to seed a playlist from');
  }
  return generateSimilarPlaylist(api, audiomuse, seed, {
    size: opts.size,
    name: `Similar to ${artist.name}`,
  });
}

/**
 * Whether the "Make a playlist from this" gesture should be shown at all —
 * true exactly when some provider currently fills the `playlist.generate`
 * capability slot. AudioMuse is the only provider today, so this reads its
 * configured-state selector directly rather than going through the generic
 * `useSlotFilled('playlist.generate')` (see `capabilityRegistry.ts`, which
 * registers AudioMuse into that same slot for generic slot-lookup callers) —
 * that path pulls in the active server adapter, downloader and external
 * source registries, which every options sheet using this gesture would
 * otherwise need to mock. Both answer with the same boolean today; if a
 * second `playlist.generate` provider ever appears, switch this to
 * `useSlotFilled('playlist.generate')` so both providers count.
 */
export function useCanGeneratePlaylist(): boolean {
  return useSelector(selectIsAudiomuseConfigured);
}
