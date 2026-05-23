import { Album, CoverSource, Song } from "@/types";
import type { JellyfinClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

// Fetches all albums + all songs in 2 requests instead of 2 per album (2N).
export async function getAlbumsWithSongs(
  client: JellyfinClient,
): Promise<Album[]> {
  const baseParams = client.parentId
    ? `&ParentId=${encodeURIComponent(client.parentId)}`
    : "";

  // Request 1: all album metadata
  const albumsRaw = await client.request<any>(
    `/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=SortName` +
    `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists,DateCreated,ProviderIds` +
    baseParams,
  );

  const albumMap = new Map<string, Album>();
  for (const a of albumsRaw?.Items ?? []) {
    if (!a.Id) continue;
    const artistItem = a.ArtistItems?.[0];
    const cover: CoverSource = { kind: "jellyfin", itemId: a.Id };
    albumMap.set(a.Id, {
      id: a.Id,
      cover,
      title: a.Name ?? "Unknown Album",
      subtext: "",
      artist: {
        id: artistItem?.Id ?? "unknown",
        name: artistItem?.Name ?? "Unknown Artist",
        cover: artistItem?.Id
          ? { kind: "jellyfin", itemId: artistItem.Id }
          : { kind: "none" },
        subtext: "Artist",
        mbid: artistItem?.ProviderIds?.MusicBrainz ?? null,
      },
      year: a.ProductionYear,
      genres: (a.Genres ?? [])
        .flatMap((g: string) => g.split(";"))
        .map((g: string) => g.trim())
        .filter(Boolean),
      created: a.DateCreated ? new Date(a.DateCreated) : new Date(0),
      mbid: a.ProviderIds?.MusicBrainzAlbum ?? a.ProviderIds?.MusicBrainz ?? null,
      songs: [],
    });
  }

  if (albumMap.size === 0) return [];

  // Request 2: all songs across the entire library
  const songsRaw = await client.request<any>(
    `/Items?IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber` +
    `&Fields=RunTimeTicks,ArtistItems,MediaSources,Genres,PremiereDate,DateCreated,AlbumId` +
    baseParams,
  );

  const songsByAlbum = new Map<string, Song[]>();
  for (const s of songsRaw?.Items ?? []) {
    const albumId: string = s.AlbumId;
    if (!albumId || !albumMap.has(albumId)) continue;

    const artistItem = s.ArtistItems?.[0];
    const ms = s.MediaSources?.[0];
    const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");
    const album = albumMap.get(albumId)!;

    const song: Song = {
      id: s.Id,
      title: s.Name,
      artist: artistItem?.Name ?? "Unknown Artist",
      artistId: artistItem?.Id ?? album.artist.id,
      cover: album.cover,
      duration: String(Math.round(Number(s.RunTimeTicks ?? 0) / 10_000_000)),
      streamUrl: client.buildStreamUrl(s.Id),
      albumId,
      albumTitle: album.title,
      bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
      sampleRate: audioStream?.SampleRate ?? undefined,
      bitsPerSample: audioStream?.BitDepth ?? undefined,
      mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
      dateReleased: s.PremiereDate ?? undefined,
      disc: s.ParentIndexNumber ?? undefined,
      trackNumber: s.IndexNumber ?? undefined,
      dateAdded: s.DateCreated ?? undefined,
      genres: normalizeGenres(s.Genres),
    };

    const list = songsByAlbum.get(albumId) ?? [];
    list.push(song);
    songsByAlbum.set(albumId, list);
  }

  const albums: Album[] = [];
  for (const [id, album] of albumMap) {
    const songs = songsByAlbum.get(id) ?? [];
    albums.push({
      ...album,
      songs,
      subtext: songs.length === 1
        ? `Single • ${album.artist.name}`
        : `Album • ${album.artist.name}`,
    });
  }
  return albums;
}
