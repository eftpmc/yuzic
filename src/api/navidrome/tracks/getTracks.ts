import { SongBase } from "@/types";
import type { NavidromeClient } from "../client";
import { getAlbumList } from "../albums/getAlbumList";
import { getAlbum } from "../albums/getAlbum";

export async function getTracks(client: NavidromeClient): Promise<SongBase[]> {
  const albums = await getAlbumList(client, "alphabeticalByName");
  const albumResults = await Promise.allSettled(
    albums.map((album) => getAlbum(client, album.id))
  );

  const deduped = new Map<string, SongBase>();
  for (const result of albumResults) {
    if (result.status !== "fulfilled" || !result.value) continue;

    for (const song of result.value.songs) {
      if (!deduped.has(song.id)) {
        deduped.set(song.id, {
          id: song.id,
          title: song.title,
          artist: song.artist,
          artistId: song.artistId,
          cover: song.cover,
          duration: song.duration,
          albumId: song.albumId,
          year: song.dateReleased ? parseInt(song.dateReleased, 10) : undefined,
          dateAdded: song.dateAdded,
        });
      }
    }
  }

  const result: SongBase[] = [];
  deduped.forEach(v => result.push(v));
  return result;
}
