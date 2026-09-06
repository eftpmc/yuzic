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
          const { positionSec, durationSec } = event.progress;
          say(`progress ${positionSec.toFixed(1)}s / ${durationSec.toFixed(1)}s`);
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

  if (!__DEV__) return null;

  return (
    <>
      <SettingsCardHeader subtle title="yuzic-engine (dev)" />
      <SettingsCard>
        <SettingsRow label="Probe the native module" onPress={probe} />
        <SettingsRow label="Play the first library track" onPress={playFirstTrack} />
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
