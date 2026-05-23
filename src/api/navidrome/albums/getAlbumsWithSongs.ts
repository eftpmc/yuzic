import { Album, CoverSource, Song } from "@/types";
import type { NavidromeClient } from "../client";
import { getAlbumList } from "./getAlbumList";

const BATCH_SIZE = 15;

export async function getAlbumsWithSongs(client: NavidromeClient): Promise<Album[]> {
  const albumList = await getAlbumList(client, "alphabeticalByName");
  if (albumList.length === 0) return [];

  const results: Album[] = [];

  for (let i = 0; i < albumList.length; i += BATCH_SIZE) {
    const batch = albumList.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(a => client.request<any>("getAlbum.view", { id: a.id }))
    );

    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status !== "fulfilled") continue;

      const raw = result.value?.["subsonic-response"]?.album;
      if (!raw) continue;

      const cover: CoverSource = raw.coverArt
        ? { kind: "navidrome", coverArtId: raw.coverArt }
        : { kind: "none" };

      const songs: Song[] = (raw.song ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        artistId: s.artistId,
        duration: s.duration,
        cover,
        albumId: raw.id,
        albumTitle: raw.name,
        streamUrl: client.buildStreamUrl(s.id),
        filePath: s.path ?? undefined,
        bitrate: s.bitRate ?? undefined,
        sampleRate: s.samplingRate ?? undefined,
        bitsPerSample: s.bitDepth ?? undefined,
        mimeType: s.contentType ?? undefined,
        dateReleased: s.year != null ? String(s.year) : undefined,
        disc: s.discNumber ?? undefined,
        trackNumber: s.track ?? undefined,
        dateAdded: s.created ?? undefined,
        bpm: s.bpm ?? undefined,
        genres: Array.isArray(s.genres) && s.genres.length > 0
          ? s.genres.map((g: any) => g?.name ?? g).filter(Boolean)
          : s.genre ? [s.genre] : undefined,
      }));

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
