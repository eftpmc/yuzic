import type { PodcastChannel, PodcastEpisode } from '@/api/types';
import type { Song } from '@/types';
import { PODCAST_EPISODE_ID_PREFIX } from './contentKind';

/**
 * Turns a podcast episode into a Song the player accepts. The stream URL is
 * built by the caller using api.songs.buildStreamUrl(episode.playableStreamId!)
 * — we don't have the api client here, and the caller already has it.
 *
 * A prefixed id keeps podcast episodes from ever colliding with a real track
 * id in the queue, offline downloads, or history.
 */
export function podcastEpisodeToSong(
  episode: PodcastEpisode,
  channel: PodcastChannel | null,
  streamUrl: string
): Song {
  return {
    id: `${PODCAST_EPISODE_ID_PREFIX}${episode.id}`,
    title: episode.title,
    artist: channel?.title ?? 'Podcast',
    artistId: '',
    albumId: episode.channelId,
    albumTitle: channel?.title,
    cover: channel?.coverArt
      ? { kind: 'navidrome', coverArtId: channel.coverArt }
      : { kind: 'letter', name: channel?.title ?? episode.title },
    duration: String(episode.durationSeconds ?? 0),
    streamUrl,
    contentKind: 'podcastEpisode',
  };
}
