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
    /** Disc number; omitted when not available. */
    disc?: number;
    /** Track number; omitted when not available. */
    trackNumber?: number;
    year?: number;
    dateAdded?: string;
    /** Server-reported play count — populated during sync, extracted into serverSongPlays Redux state. */
    serverPlayCount?: number;
    /** Server-reported last played timestamp (ms) — populated during sync. */
    serverLastPlayedAt?: number;
}

/**
 * What kind of thing the player is playing right now. A regular song is the
 * default: known duration, scrobbleable, safe to jump within, autoplay can
 * fill from it. Radio, podcasts and previews each break some of those
 * assumptions — the player checks this field before drawing a progress bar
 * or scrobbling.
 *
 * `preview` is a 30s external clip (Deezer etc.) — has finite duration but
 * is neither scrobbleable nor a valid autoplay seed, and its streamUrl can't
 * be refreshed so a failure removes the track rather than retrying.
 *
 * Undefined is equivalent to `'song'`; a Song synthesised for a live stream,
 * a podcast episode, or a preview declares its kind explicitly.
 */
export type ContentKind = 'song' | 'liveStream' | 'podcastEpisode' | 'preview';

export interface Song extends SongBase {
    streamUrl: string;
    /** See {@link ContentKind}. Absent → treated as `'song'`. */
    contentKind?: ContentKind;
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
    /** Date added to library; omitted when not available. */
    dateAdded?: string;
    /** BPM; omitted when not available. */
    bpm?: number;
    /** Genres; omitted when not available. */
    genres?: string[];
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
