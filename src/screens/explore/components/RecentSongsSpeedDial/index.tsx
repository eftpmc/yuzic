import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useQuickAccessItems, QuickAccessItem } from '@/hooks/useQuickAccessItems';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { Song } from '@/types';

const H_PADDING = 12;
const COL_GAP = 6;
const ROW_GAP = 5;
const IMG_SIZE = 42;
const COLS = 2;

export default function RecentSongsSpeedDial() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const { playSimilar } = usePlaying();
  const items = useQuickAccessItems();

  const inFlightRef = useRef<string | null>(null);

  const cardWidth = (width - H_PADDING * 2 - COL_GAP) / COLS;

  const handlePress = async (item: QuickAccessItem) => {
    const key = `${item.kind}:${item.data.id}`;
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;
    try {
      switch (item.kind) {
        case 'album':
          navigation.navigate('albumView', { id: item.data.id });
          break;
        case 'artist':
          navigation.navigate('artistView', { id: item.data.id });
          break;
        case 'playlist':
          navigation.navigate('playlistView', { id: item.data.id });
          break;
        case 'track':
          await playSimilar(item.data as Song);
          break;
      }
    } finally {
      inFlightRef.current = null;
    }
  };

  const rows: QuickAccessItem[][] = [];
  for (let i = 0; i < items.length; i += COLS) {
    rows.push(items.slice(i, i + COLS));
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <SectionEmptyState message={t('explore.empty.recentSongs')} />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map(item => (
                <TouchableOpacity
                  key={`${item.kind}:${item.data.id}`}
                  style={[
                    styles.card,
                    { width: cardWidth, backgroundColor: colors.muted },
                  ]}
                  onPress={() => { void handlePress(item); }}
                  activeOpacity={0.7}
                >
                  <MediaImage
                    cover={item.data.cover}
                    size="thumb"
                    style={[
                      styles.image,
                      item.kind === 'artist' && styles.imageCircle,
                    ]}
                  />
                  <Text
                    style={[styles.title, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.kind === 'artist' ? item.data.name : item.data.title}
                  </Text>
                </TouchableOpacity>
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
    paddingBottom: 4,
    paddingHorizontal: H_PADDING,
  },
  grid: {
    gap: ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    overflow: 'hidden',
    height: IMG_SIZE,
  },
  image: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: 0,
    flexShrink: 0,
  },
  imageCircle: {
    borderRadius: IMG_SIZE / 2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
});
