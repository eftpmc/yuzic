import { AlbumBase, ExternalAlbumBase } from "./Album";
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

export interface ExternalArtistBase {
    id: string;
    name: string;
    cover: CoverSource;
    subtext: string;
}

export interface ExternalArtist extends ExternalArtistBase {
    albums: ExternalAlbumBase[];
}