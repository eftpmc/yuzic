const BASE = 'https://musicbrainz.org/ws/2';
const HEADERS = {
  'User-Agent': 'yuzic/1.0 (https://github.com/yuzic)',
  'Accept': 'application/json',
};

async function mb<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export type MbArtist = {
  id: string;
  name: string;
  score?: number;
  annotation?: string;
  'release-groups'?: MbReleaseGroup[];
};

export type MbReleaseGroup = {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: { name?: string; artist: { name: string } }[];
};

export type MbTrack = {
  id: string;
  title: string;
  length: number | null;
  position: number;
  recording?: { id: string };
  'artist-credit'?: { name?: string; artist: { name: string } }[];
};

export type MbRelease = {
  id: string;
  title: string;
  media: { tracks: MbTrack[] }[];
};

export function coverArtArchiveUrl(mbid: string): string {
  return `https://coverartarchive.org/release-group/${mbid}/front-500`;
}

export async function searchArtist(name: string, limit = 5): Promise<MbArtist[]> {
  const q = encodeURIComponent(`artist:"${name}"`);
  const data = await mb<{ artists: MbArtist[] }>(`/artist?query=${q}&limit=${limit}&fmt=json`);
  return data.artists ?? [];
}

export async function searchReleaseGroup(
  artist: string,
  title: string,
  limit = 5
): Promise<MbReleaseGroup[]> {
  const q = encodeURIComponent(`artist:"${artist}" releasegroup:"${title}"`);
  const data = await mb<{ 'release-groups': MbReleaseGroup[] }>(
    `/release-group?query=${q}&limit=${limit}&fmt=json`
  );
  return data['release-groups'] ?? [];
}

export async function getArtistWithReleases(mbid: string): Promise<MbArtist> {
  return mb<MbArtist>(`/artist/${mbid}?inc=release-groups&fmt=json`);
}

export async function getReleaseGroup(mbid: string): Promise<MbReleaseGroup> {
  return mb<MbReleaseGroup>(`/release-group/${mbid}?inc=artist-credits&fmt=json`);
}

export async function getTracksForReleaseGroup(mbid: string): Promise<MbTrack[]> {
  const data = await mb<{ releases: MbRelease[] }>(
    `/release?release-group=${mbid}&inc=recordings+artist-credits&limit=1&fmt=json`
  );
  const release = data.releases?.[0];
  if (!release) return [];
  return release.media.flatMap(m => m.tracks ?? []);
}
