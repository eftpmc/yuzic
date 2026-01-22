import { AlbumBase } from '@/types/Album';
import { ArtistBase } from '@/types/Artist';
import { CoverSource } from '@/types/Cover';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'Yuzic';

export type NavidromeSearchResult = {
  albums: AlbumBase[];
  artists: ArtistBase[];
};

export async function search(
  serverUrl: string,
  username: string,
  password: string,
  query: string
): Promise<NavidromeSearchResult> {
  if (!query.trim()) {
    return { albums: [], artists: [] };
  }

  const url =
    `${serverUrl}/rest/search3.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&query=${encodeURIComponent(query)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json`;

  const res = await fetch(url);
  const data = await res.json();

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
      cover: {
        kind: 'navidrome-artist',
        id: a.artistId,
      },
    },
    cover: {
      kind: 'navidrome',
      coverArtId: a.coverArt,
    },
    year: a.year ?? 0,
    genres: a.genre ? [a.genre] : [],
  }));

  const artists: ArtistBase[] = (r.artist ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    subtext: 'Artist',
    cover: {
      kind: 'navidrome',
      coverArtId: a.coverArt,
    },
  }));

  return { albums, artists };
}