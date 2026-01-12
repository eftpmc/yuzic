import { ArtistBase } from "./Artist";
import { CoverSource } from "./Cover";
import { Song } from "./Song";

export interface AlbumBase {
    id: string;
    cover: CoverSource;
    title: string;
    subtext: string;
    artist: ArtistBase;
    userPlayCount: number;
}

export interface Album extends AlbumBase {
    songs: Song[]
}