import { AlbumBase } from "@/types";

export type GetArtistInfoResult = {
    albums: AlbumBase[]
    bio: string
};

const normalizeLastFmAlbum = (album: any): AlbumBase => {
    return {
        id: album.name,
        title: album.name,
        cover: album.image[2]["#text"],
        subtext: album.artist?.name ?? '',
        artist: {
            id: '',
            cover: '',
            name: album.artist.name ?? '',
            subtext: 'Artist',
        },
        userPlayCount: 0,
    };
};


export const getArtistInfo = async (artistName: string): Promise<GetArtistInfoResult> => {
    try {
        const response = await fetch(
            `https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/artist?name=${encodeURIComponent(
                artistName
            )}`
        );

        const data = await response.json();

        const albums: AlbumBase[] = Array.isArray(data.albums)
            ? data.albums.map(normalizeLastFmAlbum)
            : [];

        return {
            albums: albums,
            bio: data.bio || ""
        };
    } catch (error) {
        console.warn(`❌ Failed to fetch Last.fm data for "${artistName}":`, error);
        return { albums: [], bio: "" };
    }
};
