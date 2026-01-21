export type CoverSource =
  | { kind: 'special'; name: 'heart' }
  | { kind: 'none' }
  | { kind: 'navidrome'; coverArtId: string }
  | { kind: 'jellyfin'; itemId: string; imageType?: 'Primary' | 'Backdrop'; tag?: string }
  | { kind: 'lastfm'; url: string }
  | { kind: 'musicbrainz' };

export const COVER_PX: Record<'thumb' | 'grid' | 'detail' | 'background', number> = {
  thumb: 96,
  grid: 420,
  detail: 1200,
  background: 1800,
};