import { CoverSource } from "./Cover";
import { Song } from "./Song";

export interface Playlist {
    id: string;
    cover: CoverSource;
    title: string;
    subtext: string;
    changed: Date;
    created: Date;
    songs: Song[];
}
