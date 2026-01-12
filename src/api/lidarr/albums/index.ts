import { createLidarrClient } from '../client';
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

async function getAllArtists(config: LidarrConfig) {
  const { request } = createLidarrClient(config);
  return request<any[]>('/artist');
}

async function getAlbumsByArtist(config: LidarrConfig, artistId: number) {
  const { request } = createLidarrClient(config);
  return request<LidarrAlbum[]>(`/album?artistId=${artistId}`);
}

async function triggerAlbumSearch(config: LidarrConfig, albumId: number) {
  const { request } = createLidarrClient(config);

  await request('/command', {
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

  const normalizedAlbum = normalize(albumTitle);
  const normalizedArtist = normalize(artistName);

  try {
    const localArtists = await getAllArtists(config);
    const matchedArtist = localArtists.find(
      a => normalize(a.artistName) === normalizedArtist
    );

    console.log("beep")

    if (matchedArtist) {
      console.log("hey")
      const albums = await getAlbumsByArtist(config, matchedArtist.id);
      console.log(albums)
      const album = albums.find(
        a => normalize(a.title) === normalizedAlbum
      );

      console.log(album)

      if (album) {
        await triggerAlbumSearch(config, album.id);
        return { success: true };
      }
    }

    const lookupResults = await lookupArtist(config, artistName);
    if (!lookupResults || lookupResults.length === 0) {
      return { success: false, message: 'Artist not found in lookup' };
    }

    const candidates = lookupResults
      .filter(a => normalize(a.artistName) === normalizedArtist)
      .slice(0, 3);

    for (const candidate of candidates) {
      const ensured = await ensureArtist(config, candidate, {
        monitored: false,
        searchForMissingAlbums: true,
      });

      if (!ensured.success) continue;

      const artistId = ensured.artistId;

      const album = await waitForAlbum(
        config,
        artistId,
        normalizedAlbum,
        {
          timeoutMs: 90_000,
          pollIntervalMs: 2_500,
        }
      );

      if (album) {
        await triggerAlbumSearch(config, album.id);
        return { success: true };
      }

      if (ensured.created) {
        await deleteArtist(config, artistId);
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
  config: LidarrConfig,
  artistId: number,
  normalizedAlbum: string,
  {
    timeoutMs = 60_000,
    pollIntervalMs = 2_000,
  } = {}
): Promise<LidarrAlbum | null> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const albums = await getAlbumsByArtist(config, artistId);

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