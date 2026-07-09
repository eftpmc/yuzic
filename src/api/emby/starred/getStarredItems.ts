import { AlbumBase, Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";
import { normalizeAlbum } from "../albums/getAlbums";

export interface GetStarredItemsResult {
  songs: Song[];
  albums: AlbumBase[];
}

async function fetchGetStarredSongs(client: EmbyClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?Recursive=true` +
    `&Filters=IsFavorite` +
    `&IncludeItemTypes=Audio` +
    `&Fields=Id,Name,Artists,AlbumId,RunTimeTicks,ImageTags,MediaSources,Genres,PremiereDate,DateCreated`;
  return client.request<any>(path);
}

async function fetchGetStarredAlbums(client: EmbyClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?Recursive=true` +
    `&Filters=IsFavorite` +
    `&IncludeItemTypes=MusicAlbum` +
    `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists,DateCreated,ProviderIds,UserData`;
  return client.request<any>(path);
}

function normalizeStarredSongs(raw: any, client: EmbyClient): Song[] {
  const items = raw?.Items ?? [];

  return items.map((i: any) => {
    const ms = i.MediaSources?.[0];
    const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");
    return {
      id: i.Id,
      title: i.Name,
      artist: i.ArtistItems?.[0]?.Name ?? "Unknown Artist",
      artistId: i.ArtistItems?.[0]?.Id ?? "",
      albumId: i.AlbumId ?? "",
      cover: (i.AlbumId && i.AlbumPrimaryImageTag)
        ? { kind: "emby", itemId: i.AlbumId, tag: i.AlbumPrimaryImageTag }
        : { kind: "none" },
      duration: String(Math.floor((i.RunTimeTicks ?? 0) / 10_000_000)),
      streamUrl: client.buildStreamUrl(i.Id),
      bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
      sampleRate: audioStream?.SampleRate ?? undefined,
      bitsPerSample: audioStream?.BitDepth ?? undefined,
      mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
      dateReleased: i.PremiereDate ?? undefined,
      disc: i.ParentIndexNumber ?? undefined,
      trackNumber: i.IndexNumber ?? undefined,
      dateAdded: i.DateCreated ?? undefined,
      genres: normalizeGenres(i.Genres),
    };
  });
}

export async function getStarredItems(
  client: EmbyClient
): Promise<GetStarredItemsResult> {
  try {
    const [songsRaw, albumsRaw] = await Promise.all([
      fetchGetStarredSongs(client),
      fetchGetStarredAlbums(client),
    ]);

    const albumItems: any[] = albumsRaw?.Items ?? [];

    return {
      songs: normalizeStarredSongs(songsRaw, client),
      albums: albumItems.map(normalizeAlbum).filter((a): a is AlbumBase => a !== null),
    };
  } catch (error) {
    console.error("Failed to fetch Emby starred items:", error);
    return { songs: [], albums: [] };
  }
}
