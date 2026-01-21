import { AlbumBase, ArtistBase, CoverSource } from "@/types";

export type GetAlbumsResult = AlbumBase[];

async function normalizeAlbum(
  a: any,
  serverUrl: string,
  token: string
): Promise<AlbumBase | null> {
  try {
    const albumId = a.Id;
    if (!albumId) return null;

    const cover: CoverSource = albumId
          ? { kind: "jellyfin", itemId: albumId }
          : { kind: "none" };

    const artist: ArtistBase = {
      id: a.ArtistItems[0].Id,
      name: a.ArtistItems[0].Name || "Unknown Artist",
      cover: { kind: "none" },
      subtext: "Artist"
    }

    return {
      id: albumId,
      cover,
      title: a.Name ?? "Unknown Album",
      subtext: `Album • ${artist.name}`,
      artist,
      year: a.ProductionYear,
      genres: (a.Genres ?? [])
      .flatMap((g: string) => g.split(";"))
      .map((g: string) => g.trim())
      .filter(Boolean)
    };
  } catch (error) {
    console.error(`Failed to normalize album:`, error);
    return null;
  }
}

export async function getAlbums(
  serverUrl: string,
  token: string
): Promise<GetAlbumsResult> {
  try {
    const url =
      `${serverUrl}/Items` +
      `?IncludeItemTypes=MusicAlbum` +
      `&Recursive=true` +
      `&SortBy=SortName` +
      `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists`;

    const res = await fetch(url, {
      headers: {
        "X-Emby-Token": token,
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
      }
    });

    if (!res.ok) throw new Error(`Jellyfin getAlbums failed: ${res.status}`);

    const raw = await res.json();
    const items = raw?.Items ?? [];

    const albums = await Promise.all(
      items.map((a: any) => normalizeAlbum(a, serverUrl, token))
    );

    return albums.filter((a): a is AlbumBase => a !== null);
  } catch (error) {
    console.error(`Failed to fetch albums:`, error);
    return [];
  }
}