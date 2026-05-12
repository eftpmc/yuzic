import { AlbumBase } from '@/types/Album';
import { Artist } from '@/types/Artist';
import { Song } from '@/types/Song';
import type { NavidromeClient } from '../client';

export type NavidromeSearchResult = {
  albums: AlbumBase[];
  artists: Artist[];
  songs: Song[];
};

export async function search(
  client: NavidromeClient,
  query: string
): Promise<NavidromeSearchResult> {
  if (!query.trim()) {
    return { albums: [], artists: [], songs: [] };
  }

  const data = await client.request<any>("search3.view", {
    query,
    artistCount: 20,
    albumCount: 20,
    songCount: 20,
  });

  const r = data['subsonic-response']?.searchResult3;
  if (!r) {
    return { albums: [], artists: [], songs: [] };
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

  const artists: Artist[] = (r.artist ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    subtext: "Artist",
    cover: a.coverArt
      ? { kind: "navidrome" as const, coverArtId: a.coverArt }
      : { kind: "none" as const },
    albumIds: [],
  }));

  const songs: Song[] = (r.song ?? []).map((s: any) => ({
    id: s.id,
    title: s.title ?? 'Unknown',
    artist: s.artist ?? 'Unknown Artist',
    artistId: s.artistId ?? '',
    albumId: s.albumId ?? '',
    cover: s.coverArt
      ? { kind: 'navidrome' as const, coverArtId: s.coverArt }
      : { kind: 'none' as const },
    duration: String(s.duration ?? 0),
    streamUrl: client.buildStreamUrl(s.id),
    dateReleased: s.year != null ? String(s.year) : undefined,
    trackNumber: s.track ?? undefined,
    disc: s.discNumber ?? undefined,
  }));

  return { albums, artists, songs };
}
