import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { MediaImage } from '@/components/MediaImage';
import { useAI } from '@/contexts/AIContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSelector } from 'react-redux';
import { selectPromptHistory } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const Prompt: React.FC = () => {
  const { isDarkMode } = useTheme();
  const promptHistory = useSelector(selectPromptHistory);

  const {
    input,
    generatedQueue,
    isLoading,
    generateQueue,
    setInput,
    setGeneratedQueue,
  } = useAI();
  const { playSongInCollection } = usePlaying();

  const spinAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!isLoading) return;

    spinAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [isLoading]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const totalDuration = useMemo(() => {
    const seconds = generatedQueue.reduce(
      (sum, s) => sum + (parseFloat(s.duration) || 0),
      0
    );
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${min}:${sec}`;
  }, [generatedQueue]);

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Last Prompt
      </Text>

      <Text style={[styles.prompt, isDarkMode && styles.promptDark]}>
        {input || 'No prompt yet.'}
      </Text>

      <Text
        style={[
          styles.label,
          isDarkMode && styles.labelDark,
          { marginTop: 16 },
        ]}
      >
        Generated Queue
      </Text>

      <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
        {generatedQueue.length} songs • {totalDuration}
      </Text>

      <TouchableOpacity
        disabled={!input || isLoading}
        onPress={() => generateQueue(input)}
        style={[
          styles.regenButton,
          isDarkMode ? styles.regenDark : styles.regenLight,
          (!input || isLoading) && styles.disabled,
        ]}
      >
        <View style={styles.regenLeft}>
          <MaterialIcons
            name="refresh"
            size={20}
            color={isDarkMode ? '#fff' : '#000'}
            style={{ marginRight: 12 }}
          />
          <Text
            style={[
              styles.regenText,
              isDarkMode && styles.regenTextDark,
            ]}
          >
            Regenerate Queue
          </Text>
        </View>

        {isLoading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader2 size={18} color={isDarkMode ? '#ccc' : '#666'} />
          </Animated.View>
        ) : (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={isDarkMode ? '#ccc' : '#666'}
          />
        )}
      </TouchableOpacity>

      {promptHistory.length > 0 && (
        <>
          <Text
            style={[
              styles.label,
              isDarkMode && styles.labelDark,
              { marginTop: 24 },
            ]}
          >
            Prompt History
          </Text>

          {promptHistory.map((entry, i) => {
            const firstCover = entry.queue?.[0]?.cover ?? null;
            const count = entry.queue?.length ?? 0;
            const durationSec =
              entry.queue?.reduce(
                (s, song) => s + (parseFloat(song.duration) || 0),
                0
              ) ?? 0;
            const min = Math.floor(durationSec / 60);

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.historyRow,
                  isDarkMode && styles.historyRowDark,
                ]}
                onPress={() => {
                  if (entry.queue.length > 0) {
                    playSongInCollection(entry.queue[0], {
                      id: 'ai-generated',
                      title: `AI Queue • ${entry.prompt}`,
                      cover: { kind: "none" },
                      subtext: "Playlist",
                      songs: entry.queue,
                    });
                    setInput(entry.prompt);
                    setGeneratedQueue(entry.queue);
                  } else {
                    generateQueue(entry.prompt);
                  }
                }}
              >
                <MediaImage
                  cover={firstCover ?? { kind: 'none' }}
                  size="thumb"
                  style={styles.historyCover}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.historyText,
                      isDarkMode && styles.historyTextDark,
                    ]}
                    numberOfLines={1}
                  >
                    {entry.prompt}
                  </Text>
                  <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
                    {count} songs • {min} min
                  </Text>
                </View>
                <MaterialIcons
                  name="play-arrow"
                  size={24}
                  color={isDarkMode ? '#ccc' : '#666'}
                />
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );
};

export default Prompt;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
  prompt: {
    fontSize: 15,
    color: '#444',
  },
  promptDark: {
    color: '#ccc',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  metaDark: {
    color: '#999',
  },
  historyCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
  },
  regenButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regenLight: {
    backgroundColor: '#f1f1f1',
    borderColor: '#ddd',
  },
  regenDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  disabled: {
    opacity: 0.6,
  },
  regenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenText: {
    fontSize: 15,
    color: '#000',
  },
  regenTextDark: {
    color: '#fff',
  },
  historyRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyRowDark: {
    backgroundColor: '#1c1c1c',
    borderColor: '#333',
  },
  historyText: {
    fontSize: 14,
    color: '#000',
  },
  historyTextDark: {
    color: '#fff',
  },
});