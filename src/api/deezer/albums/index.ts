import { deezerClient } from '../client';
import { getDeezerAlbum, resolveDeezerAlbum } from '../catalog';

export type DeezerPreviewTrack = {
  id: number;
  title: string;
  track_position: number;
  preview: string;
  duration: number;
};

type DeezerAlbumSearchResult = {
  id: number;
  title: string;
  artist: { name: string };
};

type DeezerSearchResponse = {
  data: DeezerAlbumSearchResult[];
};

type DeezerTracksResponse = {
  data: DeezerPreviewTrack[];
};

async function searchAlbum(query: string): Promise<DeezerAlbumSearchResult | null> {
  const res = await deezerClient.request<DeezerSearchResponse>(
    `/search/album?q=${encodeURIComponent(query)}&limit=5`
  );
  return res.data?.[0] ?? null;
}

/**
 * Searches Deezer for an album by artist + title, then fetches its tracks
 * with 30s preview URLs. Returns an empty array if nothing is found.
 *
 * Strategy:
 * 1. Advanced search: artist:"X" album:"Y"  — most precise
 * 2. Fallback: plain "artist album" query    — handles punctuation/formatting differences
 */
export async function searchAlbumPreviews(
  artist: string,
  albumTitle: string
): Promise<DeezerPreviewTrack[]> {
  const resolved = await resolveDeezerAlbum(artist, albumTitle);
  let album = resolved ? { id: Number(resolved.id), title: resolved.title, artist: { name: resolved.artist } } : null;

  album ??=
    await searchAlbum(`artist:"${artist}" album:"${albumTitle}"`) ??
    await searchAlbum(`${artist} ${albumTitle}`);

  if (!album) return [];

  const tracksRes = await deezerClient.request<DeezerTracksResponse>(
    `/album/${album.id}/tracks`
  );

  return tracksRes.data?.filter(t => !!t.preview) ?? [];
}

export async function getAlbumEmbeddedPreviews(albumId: string): Promise<DeezerPreviewTrack[]> {
  const album = await getDeezerAlbum(albumId);
  return (album?.songs ?? [])
    .filter(song => !!song.previewUrl)
    .map((song, index) => ({
      id: Number(song.id),
      title: song.title,
      track_position: index + 1,
      preview: song.previewUrl!,
      duration: Number(song.duration) || 0,
    }));
}
