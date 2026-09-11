import * as FileSystem from 'expo-file-system/legacy';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { nanoid } from '@reduxjs/toolkit';

import type { CoverSource, Song } from '@/types';
import { mmkv } from '@/utils/mmkvStorage';

const KEY = 'local-library.v1';
const DIRECTORY = `${FileSystem.documentDirectory ?? ''}local-library/`;
const EMPTY_COVER: CoverSource = { kind: 'none' };

export type LocalTrack = Song & { localPath: string };
export type LocalPlaylist = { id: string; title: string; trackIds: string[]; createdAt: number; updatedAt: number };
type Snapshot = { tracks: LocalTrack[]; starredIds: string[]; playlists: LocalPlaylist[] };

const empty = (): Snapshot => ({ tracks: [], starredIds: [], playlists: [] });

export function readLocalLibrary(): Snapshot {
  const raw = mmkv.getString(KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return {
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
      starredIds: Array.isArray(parsed.starredIds) ? parsed.starredIds : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
    };
  } catch { return empty(); }
}

function write(snapshot: Snapshot) { mmkv.set(KEY, JSON.stringify(snapshot)); }

function extension(uri: string): string | null {
  const match = uri.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  const ext = match?.[1]?.toLowerCase();
  return ext && ['flac', 'mp3', 'm4a', 'mp4'].includes(ext) ? ext : null;
}

function labelFromUri(uri: string): string {
  const leaf = decodeURIComponent(uri.split('/').pop() ?? 'Unknown track');
  return leaf.replace(/\.[^.]+$/, '');
}

async function ensureDirectory(): Promise<void> {
  if (!FileSystem.documentDirectory) throw new Error('Local file storage is unavailable.');
  const info = await FileSystem.getInfoAsync(DIRECTORY);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
}

/**
 * Copies selected audio into private app storage before indexing it. The picker
 * cache is not durable, and retaining a provider-owned URI would make a local
 * library silently disappear after OS cache cleanup.
 *
 * `@missingcore/audio-metadata` intentionally supports FLAC, MP3 and MP4/M4A.
 * Unsupported formats are rejected at import time rather than indexed with
 * invented metadata or played unreliably later.
 */
export async function importLocalFiles(assets: { uri: string; name?: string }[]): Promise<{ imported: number; unsupported: number }> {
  await ensureDirectory();
  const snapshot = readLocalLibrary();
  let imported = 0;
  let unsupported = 0;

  for (const asset of assets) {
    const ext = extension(asset.name ?? asset.uri);
    if (!ext) { unsupported += 1; continue; }

    const id = `local:${nanoid()}`;
    const destination = `${DIRECTORY}${id.replace(':', '-')}.${ext}`;
    await FileSystem.copyAsync({ from: asset.uri, to: destination });

    try {
      const tags = await getAudioMetadata(destination, ['name', 'artist', 'album', 'albumArtist', 'track', 'year']);
      const metadata = tags.metadata;
      const artist = metadata.artist || metadata.albumArtist || 'Unknown Artist';
      const albumTitle = metadata.album || 'Unknown Album';
      const artistId = `local:artist:${encodeURIComponent(artist.toLocaleLowerCase())}`;
      const albumId = `local:album:${encodeURIComponent(`${artist}\u0000${albumTitle}`.toLocaleLowerCase())}`;
      const info = await FileSystem.getInfoAsync(destination);
      const now = new Date().toISOString();
      snapshot.tracks.push({
        id,
        title: metadata.name || labelFromUri(asset.name ?? asset.uri),
        artist,
        artistId,
        albumId,
        albumTitle,
        cover: EMPTY_COVER,
        duration: '0', // This reader is tags-only; the engine reports real duration when it loads the file.
        streamUrl: destination,
        streamId: destination,
        localPath: destination,
        trackNumber: metadata.track || undefined,
        year: metadata.year || undefined,
        dateAdded: now,
        filePath: destination,
        mimeType: ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : `audio/${ext}`,
        sourceServerType: 'local',
      });
      // `getInfoAsync` is intentionally still read: an inaccessible copy must
      // not become a ghost catalog item even if the tag parser happened to
      // return a value from a stale cache.
      if (!info.exists) throw new Error('Copied local audio file is missing.');
      imported += 1;
    } catch (error) {
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
      throw error;
    }
  }
  write(snapshot);
  return { imported, unsupported };
}

export function setLocalStarred(id: string, starred: boolean): void {
  const snapshot = readLocalLibrary();
  const set = new Set(snapshot.starredIds);
  if (starred) set.add(id);
  else set.delete(id);
  snapshot.starredIds = [...set];
  write(snapshot);
}

export function addLocalPlaylist(name: string): string {
  const snapshot = readLocalLibrary();
  const id = `local:playlist:${nanoid()}`;
  const now = Date.now();
  snapshot.playlists.push({ id, title: name, trackIds: [], createdAt: now, updatedAt: now });
  write(snapshot);
  return id;
}

export function updateLocalPlaylist(id: string, patch: Partial<Pick<LocalPlaylist, 'title' | 'trackIds'>>): void {
  const snapshot = readLocalLibrary();
  const playlist = snapshot.playlists.find(entry => entry.id === id);
  if (!playlist) throw new Error('Playlist not found');
  Object.assign(playlist, patch, { updatedAt: Date.now() });
  write(snapshot);
}

export function removeLocalPlaylist(id: string): void {
  const snapshot = readLocalLibrary();
  snapshot.playlists = snapshot.playlists.filter(playlist => playlist.id !== id);
  write(snapshot);
}
