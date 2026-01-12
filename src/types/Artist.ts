import { AlbumBase } from "./Album";
import { CoverSource } from "./Cover";

export interface ArtistBase {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
}

export interface Artist extends ArtistBase {
    bio: string;
    lastfmurl: string;
    ownedAlbums: AlbumBase[];
    externalAlbums: AlbumBase[];
}