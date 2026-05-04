import { Album, ExternalAlbumBase } from "./Album";
import { CoverSource } from "./Cover";

export interface Artist {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
    /** MusicBrainz ID when available from server (Navidrome, Jellyfin) */
    mbid?: string | null;
    ownedAlbums: Album[];
}

export interface ExternalArtistBase {
    id: string;
    name: string;
    cover: CoverSource;
    subtext: string;
}

export interface ExternalArtist extends ExternalArtistBase {
    albums: ExternalAlbumBase[];
    singles: ExternalAlbumBase[];
    similarArtists: ExternalArtistBase[];
}
