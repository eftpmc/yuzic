import { CoverSource } from "./Cover";

export interface Song {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    cover: CoverSource;
    duration: string;
    streamUrl: string;
    albumId: string;
}

export interface ExternalSong {
    id: string;
    title: string;
    artist: string;
    cover: CoverSource;
    duration: string;
    albumId: string;
}