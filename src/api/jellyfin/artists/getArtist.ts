import { AlbumBase, Artist, CoverSource } from "@/types";
import { getAlbums } from "../albums/getAlbums";

export type GetArtistResult = Artist | null

export async function getArtist(
    serverUrl: string,
    token: string,
    artistId: string
): Promise<GetArtistResult> {
    const res = await fetch(`${serverUrl}/Artists`, {
        headers: {
            "X-Emby-Token": token,
            "X-Emby-Authorization":
                `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`,
        },
    });

    if (!res.ok) {
        throw new Error(`Jellyfin getArtists failed: ${res.status}`);
    }
    const artistsRaw = await res.json();

    const artistRaw = artistsRaw?.Items?.find(
        (a: any) => a.Id === artistId
    );

    if (!artistRaw) {
        throw new Error("Artist not found");
    }

    const cover: CoverSource = artistRaw.Id
      ? { kind: "jellyfin", itemId: artistRaw.Id }
      : { kind: "none" };

    const albums: AlbumBase[] = await getAlbums(serverUrl, token);

    const ownedAlbums: AlbumBase[] = albums
    .filter(album => album.artist?.id === artistRaw.Id)
    .map(album => album);

    return {
        id: artistRaw.Id,
        name: artistRaw.Name ?? "Unknown Artist",
        cover,
        subtext: "Artist",
        ownedAlbums: ownedAlbums,
    };
}