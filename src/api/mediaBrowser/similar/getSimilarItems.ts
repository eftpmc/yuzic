import type { MediaBrowserClient } from '../client';
import type { MediaBrowserItemsResponse } from '../types';
import type { AlbumBase, ExternalArtistBase } from '@/types';
import { buildCoverWithTag } from '../brand';
import { normalizeAlbum } from '../albums/getAlbums';

/**
 * /Items/{id}/Similar is Jellyfin/Emby's own similarity graph — driven by
 * shared metadata (genres, studios, era, provider ids). Only useful for
 * artists and albums here; for songs the app already uses /InstantMix, which
 * is a stronger seed-and-fill signal.
 */
async function fetchSimilar(
  client: MediaBrowserClient,
  itemId: string,
  limit: number,
  includeItemTypes: string,
  fields?: string
) {
  const path =
    `/Items/${encodeURIComponent(itemId)}/Similar` +
    `?UserId=${encodeURIComponent(client.userId)}` +
    `&Limit=${limit}` +
    `&IncludeItemTypes=${includeItemTypes}` +
    (fields ? `&Fields=${encodeURIComponent(fields)}` : '');
  const res = await client.request<MediaBrowserItemsResponse>(path);
  return res?.Items ?? [];
}

export async function getSimilarAlbums(
  client: MediaBrowserClient,
  albumId: string,
  limit = 12
): Promise<AlbumBase[]> {
  const items = await fetchSimilar(
    client,
    albumId,
    limit,
    'MusicAlbum',
    'PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists,DateCreated,ProviderIds,UserData'
  );
  return items
    .map((a) => normalizeAlbum(a, client))
    .filter((a): a is AlbumBase => a !== null);
}

/**
 * Returns lightweight artist references — the shape the artist page's
 * similar-artists carousel already accepts. IDs are the server's own itemIds
 * so tapping one lands on the local artistView.
 */
export async function getSimilarArtists(
  client: MediaBrowserClient,
  artistId: string,
  limit = 12
): Promise<ExternalArtistBase[]> {
  const items = await fetchSimilar(client, artistId, limit, 'MusicArtist');
  return items
    .filter((s) => s.Id && s.Type === 'MusicArtist')
    .map((s) => ({
      id: s.Id!,
      name: s.Name ?? 'Unknown Artist',
      cover: buildCoverWithTag(client.brand, s.Id, s.ImageTags?.Primary),
      subtext: '',
    }));
}
