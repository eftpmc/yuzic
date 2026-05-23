import { CoverSource } from "./Cover";
import { ServerType } from "./Server";
import { ExternalCatalogSource, ExternalIds } from "./Album";

export interface SongBase {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    cover: CoverSource;
    duration: string;
    albumId: string;
    /** Album title — populated from server response, used for lock screen Now Playing display. */
    albumTitle?: string;
    year?: number;
    dateAdded?: string;
    /** Server-reported play count — populated during sync, extracted into serverSongPlays Redux state. */
    serverPlayCount?: number;
    /** Server-reported last played timestamp (ms) — populated during sync. */
    serverLastPlayedAt?: number;
}

export interface Song extends SongBase {
    streamUrl: string;
    /** Source server ID; omitted when unknown. */
    sourceServerId?: string;
    /** Source server provider; omitted when unknown. */
    sourceServerType?: ServerType;
    /** File path; omitted when not available. */
    filePath?: string;
    /** Bitrate in kbps; omitted when not available. */
    bitrate?: number;
    /** Sample rate in Hz; omitted when not available. */
    sampleRate?: number;
    /** Bits per sample; omitted when not available. */
    bitsPerSample?: number;
    /** MIME type; omitted when not available. */
    mimeType?: string;
    /** Release date; omitted when not available. */
    dateReleased?: string;
    /** Disc number; omitted when not available. */
    disc?: number;
    /** Track number; omitted when not available. */
    trackNumber?: number;
    /** Date added to library; omitted when not available. */
    dateAdded?: string;
    /** BPM; omitted when not available. */
    bpm?: number;
    /** Genres; omitted when not available. */
    genres?: string[];
    /** True when this song is a 30s external preview rather than an owned track. */
    isPreview?: boolean;
}

export interface ExternalSong {
    id: string;
    title: string;
    artist: string;
    cover: CoverSource;
    duration: string;
    albumId: string;
    previewUrl?: string | null;
    externalSource?: ExternalCatalogSource;
    externalIds?: ExternalIds;
}
