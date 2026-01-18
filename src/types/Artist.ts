import { AlbumBase } from "./Album";
import { CoverSource } from "./Cover";

export interface ArtistBase {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
}

export interface Artist extends ArtistBase {
    ownedAlbums: AlbumBase[];
}

export interface LastfmArtist {
    bio: string;
    lastfmurl: string;
    externalAlbums: AlbumBase[];
}