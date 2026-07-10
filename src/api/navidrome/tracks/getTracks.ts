import { SongBase } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicResponse, SubsonicSong } from "../types";

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

export async function getTracks(client: NavidromeClient): Promise<SongBase[]> {
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
