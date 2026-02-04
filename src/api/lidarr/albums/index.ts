import { createLidarrClient, type LidarrClient } from '../client';
import {
  lookupArtist,
  ensureArtist,
  deleteArtist,
} from '../artists';
import { LidarrConfig } from '@/types';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();

type LidarrAlbum = {
  id: number;
  title: string;
  artistId: number;
};

type AlbumSearchResult =
  | { success: true }
  | { success: false; message: string };

async function getAllArtists(client: LidarrClient) {
  return client.request<any[]>('/artist');
}

async function getAlbumsByArtist(client: LidarrClient, artistId: number) {
  return client.request<LidarrAlbum[]>(`/album?artistId=${artistId}`);
}

async function triggerAlbumSearch(client: LidarrClient, albumId: number) {
  await client.request('/command', {
    method: 'POST',
    body: JSON.stringify({
      name: 'AlbumSearch',
      albumIds: [albumId],
    }),
  });
}

export async function downloadAlbum(
  config: LidarrConfig,
  albumTitle: string,
  artistName: string
): Promise<AlbumSearchResult> {
  if (!albumTitle || !artistName) {
    return { success: false, message: 'Missing album or artist name' };
  }

  const client = createLidarrClient(config);
  const normalizedAlbum = normalize(albumTitle);
  const normalizedArtist = normalize(artistName);

  try {
    const localArtists = await getAllArtists(client);
    const matchedArtist = localArtists.find(
      a => normalize(a.artistName) === normalizedArtist
    );

    if (matchedArtist) {
      const albums = await getAlbumsByArtist(client, matchedArtist.id);
      const album = albums.find(
        a => normalize(a.title) === normalizedAlbum
      );

      if (album) {
        await triggerAlbumSearch(client, album.id);
        return { success: true };
      }
    }

    const lookupResults = await lookupArtist(client, artistName);
    if (!lookupResults || lookupResults.length === 0) {
      return { success: false, message: 'Artist not found in lookup' };
    }

    const candidates = lookupResults
      .filter(a => normalize(a.artistName) === normalizedArtist)
      .slice(0, 3);

    for (const candidate of candidates) {
      const ensured = await ensureArtist(client, candidate, {
        monitored: false,
        searchForMissingAlbums: true,
      });

      if (!ensured.success) continue;

      const artistId = ensured.artistId;

      const album = await waitForAlbum(
        client,
        artistId,
        normalizedAlbum,
        {
          timeoutMs: 90_000,
          pollIntervalMs: 2_500,
        }
      );

      if (album) {
        await triggerAlbumSearch(client, album.id);
        return { success: true };
      }

      if (ensured.created) {
        await deleteArtist(client, artistId);
      }
    }

    return {
      success: false,
      message: 'Album not found from matched artists',
    };
  } catch (e: any) {
    return {
      success: false,
      message: e?.message ?? 'Album download failed',
    };
  }
}

async function waitForAlbum(
  client: LidarrClient,
  artistId: number,
  normalizedAlbum: string,
  {
    timeoutMs = 60_000,
    pollIntervalMs = 2_000,
  } = {}
): Promise<LidarrAlbum | null> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const albums = await getAlbumsByArtist(client, artistId);

    const album = albums.find(
      a => normalize(a.title) === normalizedAlbum
    );

    if (album) return album;

    await delay(pollIntervalMs);
  }

  return null;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}