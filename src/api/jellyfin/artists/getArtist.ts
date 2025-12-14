import { getArtistInfo } from "@/api/lastfm/getArtistInfo";
import { AlbumData, ArtistData } from "@/types";
import { getAlbums } from "../albums/getAlbums";

export async function getArtist(
    serverUrl: string,
    token: string,
    artistId: string
): Promise<ArtistData | null> {
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

    const lastFmData = await getArtistInfo(artistRaw.Name);
    if (!lastFmData) return null;

    const cover =
        `${serverUrl}/Items/${artistId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
        (artistRaw.ImageTags?.Primary
            ? `&tag=${artistRaw.ImageTags.Primary}`
            : "");

    const albums: AlbumData[] = await getAlbums(serverUrl, token);

    const ownedIds = albums
    .filter(album => album.artist?.id === artistRaw.Id)
    .map(album => album.id);

    return {
        id: artistRaw.Id,
        name: artistRaw.Name ?? "Unknown Artist",
        cover,
        subtext: "Artist",
        bio: lastFmData.bio,
        ownedIds,
        externalAlbums: lastFmData.albums,
    };
}