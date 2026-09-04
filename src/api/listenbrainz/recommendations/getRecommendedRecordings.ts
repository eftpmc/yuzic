import type { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from '../client';

export type LBRecommendedRecording = {
  recordingMbid: string;
  score: number;
  latestListenedAt?: string;
};

type RecommendedRecordingsResponse = {
  payload?: {
    mbids?: Array<{
      recording_mbid?: string;
      score?: number;
      latest_listened_at?: string | null;
    }>;
  };
};

/**
 * Collaborative-filtering "recordings you might like" from ListenBrainz, keyed
 * off the user's listen history. Returns MBIDs — the caller resolves each to
 * something playable (a library track when it matches, or an external stub
 * for the wanted-pipeline flow later).
 */
export async function getRecommendedRecordings(
  config: ListenBrainzConfig,
  count = 25
): Promise<LBRecommendedRecording[]> {
  const client = createListenBrainzClient(config);
  const path =
    `/cf/recommendation/user/${encodeURIComponent(config.username)}/recording` +
    `?artist_type=raw&count=${count}`;
  const res = await client.request<RecommendedRecordingsResponse>(path);
  const rows = res?.payload?.mbids ?? [];
  return rows
    .filter((r): r is { recording_mbid: string; score?: number; latest_listened_at?: string | null } =>
      typeof r?.recording_mbid === 'string' && r.recording_mbid.length > 0
    )
    .map((r) => ({
      recordingMbid: r.recording_mbid,
      score: Number(r.score ?? 0),
      latestListenedAt: r.latest_listened_at ?? undefined,
    }));
}
