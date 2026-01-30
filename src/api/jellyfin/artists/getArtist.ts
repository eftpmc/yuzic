import { AlbumBase, Artist, CoverSource } from "@/types";
import { getAlbums } from "../albums/getAlbums";

export type GetArtistResult = Artist | null;

/**
 * Fetches a single artist by ID with their albums.
 * Uses /Items?Ids= to fetch the artist and AlbumArtistIds to fetch only that artist's albums.
 */
export async function getArtist(
  serverUrl: string,
  token: string,
  artistId: string
): Promise<GetArtistResult> {
  const url =
    `${serverUrl}/Items` +
    `?Ids=${encodeURIComponent(artistId)}` +
    `&IncludeItemTypes=MusicArtist` +
    `&Fields=PrimaryImageTag,Overview,Genres,DateCreated`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) {
    throw new Error(`Jellyfin getArtist failed: ${res.status}`);
  }

  const raw = await res.json();
  const artistRaw = raw?.Items?.[0];

  if (!artistRaw) {
    throw new Error("Artist not found");
  }

  const cover: CoverSource = artistRaw.Id
    ? { kind: "jellyfin", itemId: artistRaw.Id }
    : { kind: "none" };

  const ownedAlbums: AlbumBase[] = await getAlbums(serverUrl, token, artistId);

  return {
    id: artistRaw.Id,
    name: artistRaw.Name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    ownedAlbums
  };
}