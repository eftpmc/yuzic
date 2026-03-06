import { ServerType } from '@/types';

export type DownloadProviderType = ServerType | 'unknown';
export type DownloadProviderScope = {
  serverId?: string | null;
  serverType?: ServerType | null;
};

type DownloadTrackLike = {
  originalTrack?: {
    extraPayload?: {
      serverId?: unknown;
      serverType?: unknown;
      coverKind?: unknown;
    };
  };
};

export function normalizeServerType(value: unknown): ServerType | null {
  if (value === 'navidrome' || value === 'jellyfin') return value;
  return null;
}

export function inferServerTypeFromCoverKind(value: unknown): ServerType | null {
  if (value === 'navidrome' || value === 'jellyfin') return value;
  return null;
}

export function normalizeServerId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getDownloadedTrackServerId(track: DownloadTrackLike): string | null {
  return normalizeServerId(track?.originalTrack?.extraPayload?.serverId);
}

export function getDownloadedTrackServerType(track: DownloadTrackLike): ServerType | null {
  const payload = track?.originalTrack?.extraPayload;
  return (
    normalizeServerType(payload?.serverType) ??
    inferServerTypeFromCoverKind(payload?.coverKind) ??
    null
  );
}

export function doesTrackMatchProviderScope(
  track: DownloadTrackLike,
  scope?: DownloadProviderScope
): boolean {
  if (!scope) return true;

  const scopeServerId = normalizeServerId(scope.serverId);
  const scopeServerType = normalizeServerType(scope.serverType);
  const trackServerId = getDownloadedTrackServerId(track);
  const trackServerType = getDownloadedTrackServerType(track);

  if (scopeServerId && trackServerId) return trackServerId === scopeServerId;
  if (scopeServerId && !trackServerId) return false;

  if (scopeServerType && trackServerType) return trackServerType === scopeServerType;
  if (scopeServerType && !trackServerType) return false;

  return true;
}
