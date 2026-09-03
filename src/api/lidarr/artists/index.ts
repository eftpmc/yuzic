import type { LidarrClient } from '../client';

export type LidarrArtistLookupResult = {
  id?: number;
  artistName: string;
  foreignArtistId: string;
  artistType?: string;
  disambiguation?: string;
  overview?: string;
  images?: any[];
  genres?: string[];
  ratings?: any;
  status?: string;
  monitored?: boolean;
  links?: { name?: string; url?: string }[];
};

export type LidarrArtist = LidarrArtistLookupResult & {
  id: number;
};

export type LidarrMonitorPolicy =
  | 'all'
  | 'future'
  | 'missing'
  | 'existing'
  | 'first'
  | 'latest'
  | 'none';

export type EnsureArtistOptions = {
  qualityProfileId?: number;
  metadataProfileId?: number;
  monitored?: boolean;
  searchForMissingAlbums?: boolean;
  rootFolderIndex?: number;
  /**
   * Lidarr `addOptions.monitor` — which of the new artist's albums are
   * flagged monitored at creation. Omit to let Lidarr apply its own default
   * (typically `all`), or pass `'none'` when the caller intends to enable
   * only specific albums after the fact (issue #176).
   */
  monitor?: LidarrMonitorPolicy;
};

export async function lookupArtist(
  client: LidarrClient,
  term: string
): Promise<LidarrArtistLookupResult[]> {
  if (!term?.trim()) return [];
  return client.request<LidarrArtistLookupResult[]>(
    `/artist/lookup?term=${encodeURIComponent(term)}`
  );
}

export async function getArtists(client: LidarrClient): Promise<LidarrArtist[]> {
  return client.request<LidarrArtist[]>('/artist');
}

export async function getRootFolders(client: LidarrClient): Promise<{ path: string }[]> {
  return client.request<{ path: string }[]>('/rootfolder');
}

export async function ensureArtist(
  client: LidarrClient,
  artist: LidarrArtistLookupResult,
  opts: EnsureArtistOptions = {}
): Promise<{ success: true; artistId: number; created: boolean } | { success: false; message: string }> {
  try {
    if (!artist?.foreignArtistId) {
      return { success: false, message: 'Invalid artist: missing foreignArtistId' };
    }

    const existing = await getArtists(client);
    const found = existing.find(a => a.foreignArtistId === artist.foreignArtistId);

    if (found?.id) {
      return { success: true, artistId: found.id, created: false };
    }

    const rootFolders = await getRootFolders(client);
    if (!rootFolders || rootFolders.length === 0) {
      return { success: false, message: 'No Lidarr root folders configured' };
    }

    const rootFolderIndex = opts.rootFolderIndex ?? 0;
    const rootFolderPath = rootFolders[Math.min(rootFolderIndex, rootFolders.length - 1)].path;

    const qualityProfileId = opts.qualityProfileId ?? 1;
    const metadataProfileId = opts.metadataProfileId ?? 1;

    const payload = {
      artistName: artist.artistName,
      foreignArtistId: artist.foreignArtistId,
      artistType: artist.artistType || 'Person',
      disambiguation: artist.disambiguation || '',
      overview: artist.overview || '',
      images: artist.images || [],
      genres: artist.genres || [],
      ratings: artist.ratings || {},
      status: artist.status || 'active',
      qualityProfileId,
      rootFolderPath,
      monitored: opts.monitored ?? false,
      metadataProfileId,
      addOptions: {
        searchForMissingAlbums: opts.searchForMissingAlbums ?? true,
        ...(opts.monitor !== undefined ? { monitor: opts.monitor } : {}),
      },
    };

    const created = await client.request<any>('/artist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!created?.id) {
      return { success: false, message: 'Artist added but no id returned' };
    }

    return { success: true, artistId: created.id, created: true };
  } catch (e: any) {
    // A different client may have created this artist after our first read.
    // Lidarr enforces foreignArtistId uniqueness, so re-read and converge.
    try {
      const existing = await getArtists(client);
      const found = existing.find(
        a => a.foreignArtistId === artist.foreignArtistId
      );
      if (found?.id) {
        return { success: true, artistId: found.id, created: false };
      }
    } catch {
      // Preserve the original error if reconciliation also fails.
    }
    return { success: false, message: e?.message ?? 'Failed to ensure artist' };
  }
}
