import { AlbumBase } from '@/types/Album';
import { ArtistBase } from '@/types/Artist';
import type { NavidromeClient } from '../client';

export type NavidromeSearchResult = {
  albums: AlbumBase[];
  artists: ArtistBase[];
};

export async function search(
  client: NavidromeClient,
  query: string
): Promise<NavidromeSearchResult> {
  if (!query.trim()) {
    return { albums: [], artists: [] };
  }

  const data = await client.request<any>("search3.view", { query });

  const r = data['subsonic-response']?.searchResult3;
  if (!r) {
    return { albums: [], artists: [] };
  }

  const albums: AlbumBase[] = (r.album ?? []).map((a: any) => ({
    id: a.id,
    title: a.name,
    subtext: a.artist,
    artist: {
      id: a.artistId,
      name: a.artist,
      subtext: 'Artist',
      cover: a.artistId
        ? { kind: 'navidrome' as const, coverArtId: a.artistId }
        : { kind: 'none' as const },
    },
    cover: a.coverArt
      ? { kind: "navidrome" as const, coverArtId: a.coverArt }
      : { kind: "none" as const },
    year: a.year ?? 0,
    genres: a.genre ? [a.genre] : [],
    created: a.created ? new Date(a.created) : new Date(0),
  }));

  const artists: ArtistBase[] = (r.artist ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    subtext: "Artist",
    cover: a.coverArt
      ? { kind: "navidrome" as const, coverArtId: a.coverArt }
      : { kind: "none" as const },
  }));

  return { albums, artists };
}