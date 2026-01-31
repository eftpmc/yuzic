import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRecentSongs } from '@/hooks/songs';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import SectionEmptyState from '../SectionEmptyState';

const H_PADDING = 12;
const ITEM_MARGIN = 4;
const ROW_GAP = 8;
const COLS = 3;
const MAX_SONGS = 12;

export default function RecentSongsSpeedDial() {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { songs, isLoading } = useRecentSongs();
  const { playSong } = usePlaying();

  const contentWidth = width - H_PADDING * 2;
  const totalItemMargins = COLS * (ITEM_MARGIN * 2);
  const itemSize = (contentWidth - totalItemMargins) / COLS;

  const displaySongs = songs.slice(0, MAX_SONGS);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Recent songs
      </Text>
      {isLoading ? null : displaySongs.length === 0 ? (
        <SectionEmptyState message="Play something to see it here" />
      ) : (
      <View style={styles.grid}>
        {Array.from(
          { length: Math.ceil(displaySongs.length / COLS) },
          (_, row) => (
          <View key={row} style={[styles.row, row > 0 && { marginTop: ROW_GAP }]}>
            {displaySongs.slice(row * COLS, (row + 1) * COLS).map((song) => (
              <View
                key={song.id}
                style={[styles.slot, { width: itemSize }]}
              >
                <TouchableOpacity
                  style={[styles.item, { width: itemSize, height: itemSize }]}
                  onPress={() => playSong(song)}
                  activeOpacity={0.7}
                >
                  <MediaImage
                    cover={song.cover}
                    size="grid"
                    style={[styles.cover, { width: itemSize, height: itemSize }]}
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
        ))}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: H_PADDING,
  },
  containerDark: {},
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
  grid: {},
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    marginVertical: ITEM_MARGIN,
    marginHorizontal: ITEM_MARGIN,
  },
  item: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  cover: {
    borderRadius: 8,
    position: 'absolute',
    top: 0,
    left: 0,
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
