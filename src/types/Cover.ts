export type CoverSource =
  | { kind: 'special'; name: 'heart' }
  | { kind: 'none' }
  | { kind: 'letter'; name: string }
  | { kind: 'navidrome'; coverArtId: string }
  | { kind: 'jellyfin'; itemId: string; }
  | { kind: 'emby'; itemId: string; tag?: string }
  | { kind: 'url'; url: string }
  | { kind: 'musicbrainz'; releaseGroupId: string }
  | { kind: 'coverartarchive'; mbid: string; mbidType: 'release' | 'release-group' | 'unknown' }
  | { kind: 'commons'; filename: string }

export const COVER_PX: Record<'thumb' | 'grid' | 'detail' | 'background', number> = {
  thumb: 96,
  grid: 420,
  detail: 1200,
  background: 1800,
};
