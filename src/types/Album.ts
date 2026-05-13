import { CoverSource } from "./Cover";
import { ExternalSong, Song } from "./Song";

export type ExternalCatalogSource = 'deezer' | 'musicbrainz' | 'lastfm';

export interface ExternalIds {
    deezerId?: string;
    artistDeezerId?: string;
    mbid?: string | null;
    artistMbid?: string | null;
    upc?: string | null;
    isrc?: string | null;
}

export interface AlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    subtext: string;
    artist: { id: string; name: string; cover: CoverSource; subtext: string; mbid?: string | null };
    year: number;
    genres: string[];
    created: Date;
    /** MusicBrainz ID (release or release-group) when available from server */
    mbid?: string | null;
    /** Server-reported play count — populated during sync, used to seed local stats */
    serverPlayCount?: number;
    /** Server-reported last played timestamp (unix ms) — populated during sync */
    serverLastPlayedAt?: number;
}

export interface Album extends AlbumBase {
    songs: Song[];
}

export interface ExternalAlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    artist: string;
    artistMbid?: string | null;
    subtext: string;
    releaseDate?: string
    releaseType?: 'album' | 'single'
    externalSource?: ExternalCatalogSource;
    externalIds?: ExternalIds;
}

export interface ExternalAlbum extends ExternalAlbumBase {
    songs: ExternalSong[];
}
