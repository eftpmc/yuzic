import { CoverSource } from "./Cover";

export interface Song {
    id: string;
    title: string;
    artist: string;
    cover: CoverSource;
    duration: string;
    streamUrl: string;
    albumId: string;
    userPlayCount: number;
}