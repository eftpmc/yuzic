import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsRow from '../components/SettingsRow';
import { useApi } from '@/api';
import { useLibrary } from '@/contexts/LibraryContext';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';

/**
 * Development-only: drives yuzic-engine directly, bypassing the player.
 *
 * The engine is a separate project being built to replace `@rntp/player`
 * (see github.com/eftpmc/yuzic-engine). It has a large unit-test suite, but
 * nothing had ever called it across the React Native bridge — and the bugs
 * found so far were all of the kind that only appear when something really
 * builds or really runs. This is the smallest surface that exercises the whole
 * path: JS → Expo module → audio session → cache → decoder → graph → output.
 *
 * Not wired into playback, and not shown in release builds. It goes away with
 * the rest of the scaffolding once the engine actually replaces the player.
 */
const EngineSmokeTest: React.FC = () => {
  const { colors } = useTheme();
  const api = useApi();
  const { tracks } = useLibrary();
  const activeServer = useSelector(selectActiveServer);
  const [log, setLog] = useState<string[]>([]);

  const say = useCallback((line: string) => {
    setLog(previous => [...previous.slice(-6), line]);
  }, []);

  const loadEngine = useCallback(() => {
    // Required lazily: if the native module is missing this throws, and it
    // should surface as a line in the log rather than a blank screen at import
    // time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('yuzic-engine') as typeof import('yuzic-engine');
  }, []);

  const probe = useCallback(async () => {
    setLog([]);
    try {
      const { YuzicEngine } = loadEngine();
      say(`module: ${YuzicEngine ? 'found' : 'missing'}`);
      await YuzicEngine.setup({ progressIntervalMs: 1000 });
      say('setup: ok — audio session claimed');
      toast.success('Engine responded');
    } catch (error) {
      say(`failed: ${(error as Error)?.message ?? String(error)}`);
      toast.error('Engine did not respond');
    }
  }, [loadEngine, say]);

  const playFirstTrack = useCallback(async () => {
    setLog([]);
    try {
      const track = tracks[0];
      if (!track || !activeServer) {
        say('no track in the library to play');
        return;
      }
      const url = api.songs.buildStreamUrl(track.id, 'high');
      if (!url) {
        say('no stream url — is a server connected?');
        return;
      }

      const { YuzicEngine } = loadEngine();
      await YuzicEngine.setup({ progressIntervalMs: 1000 });
      say(`playing: ${track.title}`);
      await YuzicEngine.setQueue([{
        id: track.id,
        uri: url,
        title: track.title,
        artist: track.artist,
        durationSec: Number(track.duration) || undefined,
      }], 0);
      // "play() returned" only means nothing threw. Position advancing is the
      // evidence that bytes are being fetched, decoded and rendered — a silent
      // graph reports zero forever.
      const stop = YuzicEngine.addListener(event => {
        if (event.type === 'progress') {
          const { positionSec, durationSec, bufferedSec } = event.progress;
          // bufferedSec used to be hardcoded to zero. Shown here because a
          // buffering figure pinned at zero looks exactly like a stall, and
          // that is the failure worth being able to see.
          say(
            `progress ${positionSec.toFixed(1)}s / ${durationSec.toFixed(1)}s ` +
              `(buffered ${bufferedSec.toFixed(1)}s)`
          );
        }
        if (event.type === 'stateChange') say(`state: ${event.state}`);
        if (event.type === 'error') say(`error: ${event.code} ${event.message}`);
      });
      setTimeout(stop, 12_000);

      await YuzicEngine.play();
      say('play() returned — watching progress');
      toast.success('Engine playing');
    } catch (error) {
      say(`failed: ${(error as Error)?.message ?? String(error)}`);
      toast.error('Engine playback failed');
    }
  }, [api, tracks, activeServer, loadEngine, say]);

  /**
   * Times a seek into a region the cache has not fetched.
   *
   * This is the half of `docs/architecture.md` open question 3 that a stub
   * server cannot answer: cancellation is unit-tested, but "how long until the
   * first sample at the new position" only means something against a real
   * server over a real network.
   *
   * The seek target is deliberately most of the way into the track, so it is
   * far beyond anything the two-second read-ahead has pulled. Measured from
   * just before `seekTo` to the first progress event that actually lands near
   * the target — progress reported at the *old* position is the engine not
   * having moved yet, and counting it would flatter the number.
   */
  const seekProbe = useCallback(async (quality: 'original' | 'high') => {
    setLog([]);
    try {
      const track = tracks[0];
      if (!track || !activeServer) {
        say('no track in the library to seek');
        return;
      }
      // Which transport this exercises is decided here and nowhere else, which
      // is exactly how it is easy to get wrong. `original` sends format=raw:
      // the server serves the file, honours `Range`, and a seek is a ranged
      // GET. Every other quality sends format/maxBitRate, so the server
      // transcodes, refuses ranges, and a forward seek is a reconnection with
      // `timeOffset` — a different code path with a different cost. See
      // docs/architecture.md §10 in the engine.
      const url = api.songs.buildStreamUrl(track.id, quality);
      say(quality === 'original' ? 'transport: direct (ranged)' : 'transport: transcoded (320k)');
      if (!url) {
        say('no stream url — is a server connected?');
        return;
      }

      const { YuzicEngine } = loadEngine();
      await YuzicEngine.setup({ progressIntervalMs: 250 });
      await YuzicEngine.setQueue([{
        id: track.id,
        uri: url,
        title: track.title,
        artist: track.artist,
        durationSec: Number(track.duration) || undefined,
      }], 0);
      await YuzicEngine.play();
      say(`playing: ${track.title}`);

      // Let it settle into steady playback first. Seeking during the initial
      // buffering would measure the open, not the seek.
      await new Promise(resolve => setTimeout(resolve, 4000));

      const before = await YuzicEngine.getProgress();
      if (!before.durationSec) {
        say('duration unknown — cannot pick a seek target');
        return;
      }
      const target = before.durationSec * 0.8;
      say(`at ${before.positionSec.toFixed(1)}s, buffered ${before.bufferedSec.toFixed(1)}s`);
      say(`seeking to ${target.toFixed(1)}s`);

      const started = Date.now();
      let settled = false;
      const stop = YuzicEngine.addListener(event => {
        if (settled || event.type !== 'progress') return;
        // Within five seconds of the target counts as arrived; the engine
        // resumes at the requested frame, not exactly on it.
        if (Math.abs(event.progress.positionSec - target) > 5) return;
        settled = true;
        say(`first sample at ${Date.now() - started}ms`);
        say(`buffered there: ${event.progress.bufferedSec.toFixed(1)}s`);
        stop();
      });

      await YuzicEngine.seekTo(target);
      say('seekTo() returned — waiting for audio');

      setTimeout(() => {
        if (!settled) {
          settled = true;
          stop();
          say('no sample within 15s — the seek did not arrive');
        }
      }, 15_000);
    } catch (error) {
      say(`failed: ${(error as Error)?.message ?? String(error)}`);
      toast.error('Seek probe failed');
    }
  }, [api, tracks, activeServer, loadEngine, say]);

  /**
   * Drives an actual crossfade between two tracks.
   *
   * This is the feature the whole graph architecture exists for — two sources
   * overlapping, which no single-output player can do — and until now nothing
   * had made one happen outside a unit test. Rather than wait several minutes
   * for a track to end, it seeks to just before the crossover so the engine's
   * own tick decides to begin the transition, the same way it would in the
   * middle of an album.
   *
   * The evidence is the track-change event: the engine fires it at the fade's
   * midpoint, not at its start, so `previousListenedSec` arriving with a
   * plausible figure means the overlap really was scheduled and timed.
   */
  const crossfadeProbe = useCallback(async () => {
    setLog([]);
    try {
      const pair = tracks.slice(0, 2);
      if (pair.length < 2 || !activeServer) {
        say('need two tracks in the library');
        return;
      }
      const queue = pair.map(track => ({
        id: track.id,
        uri: api.songs.buildStreamUrl(track.id, 'high') ?? '',
        title: track.title,
        artist: track.artist,
        durationSec: Number(track.duration) || undefined,
      }));
      if (queue.some(item => !item.uri)) {
        say('no stream url — is a server connected?');
        return;
      }

      const fadeSec = 8;
      const { YuzicEngine } = loadEngine();
      await YuzicEngine.setup({ progressIntervalMs: 250 });
      await YuzicEngine.setCrossfade({ durationSec: fadeSec, mode: 'always' });
      await YuzicEngine.setQueue(queue, 0);
      await YuzicEngine.play();
      say(`1: ${queue[0].title}`);
      say(`2: ${queue[1].title}`);

      const stop = YuzicEngine.addListener(event => {
        if (event.type === 'trackChange') {
          say(`crossover → index ${event.index}`);
          say(`listened ${event.previousListenedSec?.toFixed(1) ?? '?'}s of track 1`);
          stop();
        }
        if (event.type === 'error') say(`error: ${event.code} ${event.message}`);
      });
      setTimeout(stop, 60_000);

      await new Promise(resolve => setTimeout(resolve, 3000));
      const progress = await YuzicEngine.getProgress();
      if (!progress.durationSec) {
        say('duration unknown — cannot place the crossover');
        return;
      }
      // Land a few seconds before the fade would start, so the engine begins
      // the transition on its own rather than being told to.
      const target = Math.max(0, progress.durationSec - fadeSec - 4);
      say(`seeking to ${target.toFixed(1)}s of ${progress.durationSec.toFixed(1)}s`);
      await YuzicEngine.seekTo(target);
      say(`waiting for the fade (${fadeSec}s)`);
    } catch (error) {
      say(`failed: ${(error as Error)?.message ?? String(error)}`);
      toast.error('Crossfade probe failed');
    }
  }, [api, tracks, activeServer, loadEngine, say]);

  const publishBrowseTree = useCallback(async () => {
    setLog([]);
    try {
      const playable = tracks.slice(0, 20).filter(track => activeServer);
      if (playable.length === 0) {
        say('no tracks to publish');
        return;
      }

      const { YuzicEngine } = loadEngine();
      await YuzicEngine.setup({ progressIntervalMs: 1000 });

      // Grouped by album, because a flat list of every track is what CarPlay's
      // list limit exists to prevent — and because choosing a track inside an
      // album is what the engine's selection rule is built around.
      const albums = new Map<string, typeof playable>();
      for (const track of playable) {
        const name = track.albumTitle || 'Unknown album';
        albums.set(name, [...(albums.get(name) ?? []), track]);
      }

      await YuzicEngine.setBrowseTree({
        id: 'root',
        title: 'yuzic',
        children: [...albums].map(([name, albumTracks]) => ({
          id: `album:${name}`,
          title: name,
          subtitle: albumTracks[0]?.artist,
          children: albumTracks.map(track => ({
            id: `track:${track.id}`,
            title: track.title,
            subtitle: track.artist,
            playable: {
              id: track.id,
              uri: api.songs.buildStreamUrl(track.id, 'high') ?? '',
              title: track.title,
              artist: track.artist,
              album: track.albumTitle,
              durationSec: Number(track.duration) || undefined,
            },
          })),
        })),
      });
      say(`published ${albums.size} albums, ${playable.length} tracks`);
      toast.success('Browse tree published');
    } catch (error) {
      say(`failed: ${(error as Error)?.message ?? String(error)}`);
      toast.error('Browse tree failed');
    }
  }, [api, tracks, activeServer, loadEngine, say]);

  if (!__DEV__) return null;

  return (
    <>
      <SettingsCardHeader subtle title="yuzic-engine (dev)" />
      <SettingsCard>
        <SettingsRow label="Probe the native module" onPress={probe} />
        <SettingsRow label="Play the first library track" onPress={playFirstTrack} />
        <SettingsRow label="Seek: direct stream (ranged)" onPress={() => seekProbe('original')} />
        <SettingsRow label="Seek: transcoded stream (320k)" onPress={() => seekProbe('high')} />
        <SettingsRow label="Crossfade two tracks" onPress={crossfadeProbe} />
        <SettingsRow label="Publish the CarPlay browse tree" onPress={publishBrowseTree} />
      </SettingsCard>
      {log.length > 0 && (
        <View style={styles.log}>
          {log.map((line, index) => (
            <Text key={index} style={[styles.line, { color: colors.subtext }]}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  log: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  line: {
    ...typography.rowSubtitle,
    fontVariant: ['tabular-nums'],
  },
});

export default EngineSmokeTest;
