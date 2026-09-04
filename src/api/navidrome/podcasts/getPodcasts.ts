import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';
import type { PodcastChannel, PodcastEpisode } from '@/api/types';

type RawEpisode = {
  id?: string;
  streamId?: string;
  channelId?: string;
  title?: string;
  description?: string;
  publishDate?: string;
  status?: string;
  duration?: number;
  coverArt?: string;
  contentType?: string;
  bitRate?: number;
  path?: string;
};

type RawChannel = {
  id?: string;
  url?: string;
  title?: string;
  description?: string;
  coverArt?: string;
  originalImageUrl?: string;
  status?: string;
  errorMessage?: string;
  episode?: RawEpisode[];
};

function normalizeEpisode(e: RawEpisode, channelId: string): PodcastEpisode | null {
  if (!e?.id) return null;
  const status = normalizeStatus(e.status);
  return {
    id: e.id,
    streamId: e.streamId ?? null,
    channelId: e.channelId ?? channelId,
    title: e.title ?? 'Untitled episode',
    description: e.description,
    publishDate: e.publishDate,
    status,
    playableStreamId: status === 'completed' ? e.streamId ?? null : null,
    durationSeconds: typeof e.duration === 'number' ? e.duration : undefined,
    coverArt: e.coverArt ?? undefined,
  };
}

function normalizeStatus(raw: string | undefined): PodcastEpisode['status'] {
  switch (raw) {
    case 'downloading':
    case 'completed':
    case 'skipped':
    case 'error':
      return raw;
    default:
      return 'new';
  }
}

export async function getPodcasts(
  client: NavidromeClient,
  opts: { includeEpisodes?: boolean } = {}
): Promise<PodcastChannel[]> {
  try {
    const raw = await client.request<SubsonicResponse>('getPodcasts.view', {
      includeEpisodes: opts.includeEpisodes === false ? 'false' : 'true',
    });
    const channels = raw?.['subsonic-response']?.podcasts?.channel ?? [];
    if (!Array.isArray(channels)) return [];
    return channels
      .filter((c): c is RawChannel & { id: string } => !!c?.id)
      .map((c) => ({
        id: c.id,
        url: c.url ?? '',
        title: c.title ?? 'Untitled podcast',
        description: c.description,
        coverArt: c.coverArt ?? c.originalImageUrl ?? undefined,
        status: c.status ?? 'ok',
        errorMessage: c.errorMessage,
        episodes: (c.episode ?? [])
          .map((e) => normalizeEpisode(e, c.id))
          .filter((e): e is PodcastEpisode => e !== null),
      }));
  } catch (error) {
    console.error('Navidrome getPodcasts failed:', error);
    return [];
  }
}

export async function getNewestPodcasts(
  client: NavidromeClient,
  count = 20
): Promise<PodcastEpisode[]> {
  try {
    const raw = await client.request<SubsonicResponse>('getNewestPodcasts.view', { count });
    const items = raw?.['subsonic-response']?.newestPodcasts?.episode ?? [];
    if (!Array.isArray(items)) return [];
    return items
      .map((e) => normalizeEpisode(e as RawEpisode, ''))
      .filter((e): e is PodcastEpisode => e !== null);
  } catch (error) {
    console.error('Navidrome getNewestPodcasts failed:', error);
    return [];
  }
}

export async function createPodcastChannel(client: NavidromeClient, url: string): Promise<void> {
  await client.request('createPodcastChannel.view', { url });
}

export async function deletePodcastChannel(client: NavidromeClient, id: string): Promise<void> {
  await client.request('deletePodcastChannel.view', { id });
}

export async function deletePodcastEpisode(client: NavidromeClient, id: string): Promise<void> {
  await client.request('deletePodcastEpisode.view', { id });
}

export async function downloadPodcastEpisode(client: NavidromeClient, id: string): Promise<void> {
  await client.request('downloadPodcastEpisode.view', { id });
}

export async function refreshPodcasts(client: NavidromeClient): Promise<void> {
  await client.request('refreshPodcasts.view', {});
}
