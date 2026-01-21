import { ArtistBase } from "./Artist";
import { CoverSource } from "./Cover";
import { ExternalSong, Song } from "./Song";

export interface AlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    subtext: string;
    artist: ArtistBase;
    year: number;
    genres: string[];
}

export interface Album extends AlbumBase {
    songs: Song[]
}

export interface ExternalAlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    artist: string;
    subtext: string;
}

export interface ExternalAlbum extends ExternalAlbumBase {
    songs: ExternalSong[];
}