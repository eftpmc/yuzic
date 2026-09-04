import type { InternetRadioStation } from '@/api/types';
import type { Song } from '@/types';
import { LIVE_STREAM_ID_PREFIX } from './contentKind';

/**
 * Turns a radio station into a Song object the player can accept. Every field
 * except title and streamUrl is a placeholder: duration '0' means "unknown /
 * infinite", empty albumId/artistId short-circuit relationship lookups, and
 * the id is namespaced with a radio: prefix so it can never collide with a
 * real track id in queue-persist or history.
 */
export function stationToSong(station: InternetRadioStation): Song {
  return {
    id: `${LIVE_STREAM_ID_PREFIX}${station.id}`,
    title: station.name,
    artist: 'Live Radio',
    artistId: '',
    albumId: '',
    cover: { kind: 'letter', name: station.name },
    duration: '0',
    streamUrl: station.streamUrl,
    contentKind: 'liveStream',
  };
}
