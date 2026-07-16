// UNVERIFIED — placeholder shapes, not confirmed against a live AudioMuse-AI
// instance. AudioMuse-AI's endpoint contracts are only browsable via its own
// Swagger UI (<host>:8000/apidocs/), which hasn't been checked yet. Update
// these once real payloads are seen; callers only depend on this module, not
// on these shapes directly.

export interface AudiomuseTrackRef {
  itemId: string; // assumed to match the active Navidrome/Jellyfin/Emby server's native item id
  title?: string;
  artist?: string;
}

export interface AudiomusePingResult {
  ok: boolean;
  version?: string;
}

export interface AudiomuseSimilarityResult {
  tracks: AudiomuseTrackRef[];
}

export interface AudiomuseSongPathResult {
  path: AudiomuseTrackRef[];
}
