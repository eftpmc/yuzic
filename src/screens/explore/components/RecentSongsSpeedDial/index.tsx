import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRecentSongs } from '@/hooks/songs';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';

const H_PADDING = 12;
const ROW_GAP = 8;
const COLS = 3;
const MAX_SONGS = 6;

export default function RecentSongsSpeedDial() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { songs, isLoading } = useRecentSongs();
  const { playSimilar } = usePlaying();

  const inFlightSongIdRef = useRef<string | null>(null);

  const displaySongs = songs.slice(0, MAX_SONGS);

  const handlePressSong = async (song: typeof displaySongs[number]) => {
    if (inFlightSongIdRef.current === song.id) return;

    inFlightSongIdRef.current = song.id;

    try {
      await playSimilar(song);
    } finally {
      if (inFlightSongIdRef.current === song.id) {
        inFlightSongIdRef.current = null;
      }
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.padded}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          {t('explore.sections.dial')}
        </Text>

        {isLoading ? null : displaySongs.length === 0 ? (
          <SectionEmptyState message={t('explore.empty.recentSongs')} />
        ) : (
          <View style={styles.grid}>
            {Array.from(
              { length: Math.ceil(displaySongs.length / COLS) },
              (_, row) => (
                <View key={row} style={styles.row}>
                  {displaySongs
                    .slice(row * COLS, (row + 1) * COLS)
                    .map((song) => (
                      <View key={song.id} style={styles.slot}>
                        <TouchableOpacity
                          style={styles.item}
                          onPress={() => {
                            void handlePressSong(song);
                          }}
                          activeOpacity={0.7}
                        >
                          <MediaImage
                            cover={song.cover}
                            size="grid"
                            style={styles.cover}
                          />

                          <Text
                            style={styles.songTitle}
                            numberOfLines={2}
                          >
                            {song.title}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  containerDark: {},

  padded: {
    paddingHorizontal: H_PADDING,
  },

  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  titleDark: {
    color: '#888',
  },

  grid: {
    width: '100%',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: ROW_GAP,
  },

  slot: {
    width: '32%',
  },

  item: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },

  cover: {
    borderRadius: 8,
    ...StyleSheet.absoluteFillObject,
  },

  songTitle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});