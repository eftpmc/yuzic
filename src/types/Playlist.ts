import { CoverSource } from "./Cover";
import { Song } from "./Song";

export interface PlaylistBase {
    id: string;
    cover: CoverSource;
    title: string;
    subtext: string;
    changed: Date;
    created: Date;
}

export interface Playlist extends PlaylistBase {
    songs: Song[];
}
