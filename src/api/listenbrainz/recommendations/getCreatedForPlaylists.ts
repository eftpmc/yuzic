import { fetchWithTimeout } from '../../fetchWithTimeout';
import type { ExternalSong } from '@/types';

const BASE_URL = 'https://api.listenbrainz.org/1';

/** The three periodic mixes troi-bot generates for a user. Anything else
 * ListenBrainz might create-for (a one-off, a different bot) is ignored —
 * this shelf mirrors the LOCKED set, not "whatever comes back". */
export const CREATED_FOR_MIX_TYPES = ['daily-jams', 'weekly-jams', 'weekly-exploration'] as const;

export type CreatedForMixType = (typeof CREATED_FOR_MIX_TYPES)[number];

export type LBCreatedForMix = {
  mixType: CreatedForMixType;
  title: string;
  playlistMbid: string;
  tracks: ExternalSong[];
};

type JspfTrack = {
  title?: string;
  creator?: string;
  album?: string;
  identifier?: string | string[];
  duration?: number;
};

type JspfPlaylist = {
  title?: string;
  track?: JspfTrack[];
  identifier?: string;
  extension?: {
    'https://musicbrainz.org/doc/jspf#playlist'?: {
      additional_metadata?: {
        algorithm_metadata?: {
          source_patch?: string;
        };
      };
    };
  };
};

type CreatedForResponse = {
  playlists?: { playlist: JspfPlaylist }[];
};

type PlaylistResponse = {
  playlist?: JspfPlaylist;
};

function extractMbidFromIdentifier(identifier?: string | string[]): string | null {
  const first = Array.isArray(identifier) ? identifier[0] : identifier;
  if (!first) return null;
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i.exec(first);
  return match ? match[1] : null;
}

function playlistMbidFromIdentifier(identifier?: string): string | null {
  if (!identifier) return null;
  const parts = identifier.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function mapTrack(track: JspfTrack): ExternalSong | null {
  if (!track.title || !track.creator) return null;
  const mbid = extractMbidFromIdentifier(track.identifier);
  return {
    id: mbid ?? `${track.creator}:${track.title}`,
    title: track.title,
    artist: track.creator,
    cover: { kind: 'letter', name: track.creator },
    duration: track.duration ? String(Math.round(track.duration / 1000)) : '',
    albumId: track.album ?? '',
    externalSource: 'musicbrainz',
    externalIds: mbid ? { mbid } : undefined,
  };
}

/**
 * Fetches one createdfor playlist's full track listing.
 *
 * Public — createdfor playlists are always public — so no token is needed,
 * though sending one is harmless.
 */
async function fetchPlaylistTracks(playlistMbid: string): Promise<ExternalSong[]> {
  const res = await fetchWithTimeout(`${BASE_URL}/playlist/${playlistMbid}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as PlaylistResponse;
  const tracks = data.playlist?.track ?? [];
  const mapped: ExternalSong[] = [];
  for (const track of tracks) {
    const song = mapTrack(track);
    if (song) mapped.push(song);
  }
  return mapped;
}

/**
 * ListenBrainz's periodic "created for you" mixes — Daily Jams, Weekly Jams,
 * Weekly Exploration — built by troi-bot, not by anything in this app. This
 * fetches the metadata list, keeps only the three known mix types (matched by
 * `source_patch` in the JSPF algorithm metadata, falling back to the title
 * when that's missing), and fills each one in with its tracks.
 *
 * Public — no auth required — but needs a username to fetch for. Returns []
 * rather than throwing on any failure, missing username, or empty response:
 * this is a Home shelf, not a critical path, and an empty array is what
 * makes the shelf hide itself.
 */
export async function getCreatedForPlaylists(username?: string | null): Promise<LBCreatedForMix[]> {
  if (!username) return [];

  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/user/${encodeURIComponent(username)}/playlists/createdfor`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as CreatedForResponse;
    const stubs = data.playlists ?? [];

    const matched: { mixType: CreatedForMixType; title: string; playlistMbid: string }[] = [];
    for (const { playlist } of stubs) {
      const sourcePatch =
        playlist.extension?.['https://musicbrainz.org/doc/jspf#playlist']?.additional_metadata
          ?.algorithm_metadata?.source_patch;
      const mixType = (CREATED_FOR_MIX_TYPES as readonly string[]).includes(sourcePatch ?? '')
        ? (sourcePatch as CreatedForMixType)
        : null;
      if (!mixType) continue;

      const playlistMbid = playlistMbidFromIdentifier(playlist.identifier);
      if (!playlistMbid) continue;

      matched.push({ mixType, title: playlist.title ?? mixType, playlistMbid });
    }

    const results = await Promise.allSettled(
      matched.map(async (m) => ({
        ...m,
        tracks: await fetchPlaylistTracks(m.playlistMbid),
      }))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<LBCreatedForMix> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((mix) => mix.tracks.length > 0);
  } catch (error) {
    console.error('ListenBrainz getCreatedForPlaylists failed:', error);
    return [];
  }
}
