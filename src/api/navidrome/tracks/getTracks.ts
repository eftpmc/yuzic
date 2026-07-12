import { SongBase } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicResponse, SubsonicSong } from "../types";
import { getAlbumList } from "../albums/getAlbumList";

const ALBUM_BATCH_SIZE = 15;

function mapToSongBase(song: SubsonicSong & { id: string }): SongBase {
  return {
    id: song.id,
    title: song.title ?? 'Unknown',
    artist: song.artist ?? 'Unknown Artist',
    artistId: song.artistId ?? '',
    cover: song.coverArt
      ? { kind: 'navidrome' as const, coverArtId: song.coverArt }
      : { kind: 'none' as const },
    duration: String(song.duration ?? 0),
    albumId: song.albumId ?? '',
    disc: song.discNumber ?? undefined,
    trackNumber: song.track ?? undefined,
    year: song.year ?? undefined,
    dateAdded: song.created,
    serverPlayCount: song.playCount ?? undefined,
    serverLastPlayedAt: song.played ? (new Date(song.played).getTime() || undefined) : undefined,
  };
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getTracksViaSearch(client: NavidromeClient): Promise<SongBase[]> {
  const PAGE = 500;
  const all = new Map<string, SongBase>();
  let offset = 0;

  while (true) {
    const data = await client.request<SubsonicResponse>("search3.view", {
      query: "",
      songCount: PAGE,
      songOffset: offset,
      albumCount: 0,
      albumOffset: 0,
      artistCount: 0,
      artistOffset: 0,
    });

    const songs = asArray(data["subsonic-response"]?.searchResult3?.song);
    if (!songs.length) break;

    for (const song of songs) {
      if (!song?.id || all.has(song.id)) continue;
      all.set(song.id, mapToSongBase(song as SubsonicSong & { id: string }));
    }
    if (songs.length < PAGE) break;
    offset += PAGE;
  }

  return [...all.values()];
}

async function getTracksViaAlbumList(client: NavidromeClient): Promise<SongBase[]> {
  const albums = await getAlbumList(client, "alphabeticalByName");
  const all = new Map<string, SongBase>();

  for (let i = 0; i < albums.length; i += ALBUM_BATCH_SIZE) {
    const batch = albums.slice(i, i + ALBUM_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((a) => client.request<SubsonicResponse>("getAlbum.view", { id: a.id }))
    );

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      const album = result.value?.["subsonic-response"]?.album;
      if (!album) continue;

      for (const song of album.song ?? []) {
        if (!song?.id || all.has(song.id)) continue;
        const withAlbumFallbacks: SubsonicSong & { id: string } = {
          ...song,
          id: song.id,
          artist: song.artist ?? album.artist,
          artistId: song.artistId ?? album.artistId,
          albumId: song.albumId ?? album.id,
          coverArt: song.coverArt ?? album.coverArt,
          created: song.created ?? album.created,
        };
        all.set(song.id, mapToSongBase(withAlbumFallbacks));
      }
    }
  }

  return [...all.values()];
}

export async function getTracks(client: NavidromeClient): Promise<SongBase[]> {
  // OpenSubsonic servers (Navidrome, recent gonic) return the full library for an
  // empty search3 query; plain Subsonic servers (Ampache, Airsonic, …) return
  // nothing or an error for it, so fall back to walking the album list.
  let viaSearch: SongBase[] = [];
  try {
    viaSearch = await getTracksViaSearch(client);
  } catch {
    viaSearch = [];
  }
  if (viaSearch.length > 0) return viaSearch;

  return getTracksViaAlbumList(client);
}
