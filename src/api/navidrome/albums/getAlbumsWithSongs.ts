import { Album } from "@/types";
import type { NavidromeClient } from "../client";
import { getAlbumList } from "./getAlbumList";
import { mapAlbumSongs } from "./mapAlbumSongs";
import { SubsonicResponse } from "../types";

const BATCH_SIZE = 15;

export async function getAlbumsWithSongs(client: NavidromeClient): Promise<Album[]> {
  const albumList = await getAlbumList(client, "alphabeticalByName");
  if (albumList.length === 0) return [];

  const results: Album[] = [];

  for (let i = 0; i < albumList.length; i += BATCH_SIZE) {
    const batch = albumList.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(a => client.request<SubsonicResponse>("getAlbum.view", { id: a.id }))
    );

    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status !== "fulfilled") continue;

      const raw = result.value?.["subsonic-response"]?.album;
      if (!raw) continue;

      const cover = raw.coverArt
        ? { kind: "navidrome" as const, coverArtId: raw.coverArt }
        : { kind: "none" as const };
      const songs = mapAlbumSongs(raw, cover, client);

      const base = batch[j];
      results.push({
        ...base,
        cover,
        songs,
        subtext: songs.length === 1
          ? `Single • ${raw.artist ?? base.artist.name}`
          : `Album • ${raw.artist ?? base.artist.name}`,
      });
    }
  }

  return results;
}
