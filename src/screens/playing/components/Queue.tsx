import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GripVertical } from 'lucide-react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlbums } from '@/hooks/albums';
import { Song } from '@/types';

type QueueItemProps = {
  item: Song;
  index: number;
  isCurrent: boolean;
  onPress: (index: number) => void;
  onLongPress: () => void;
};

function queueItemPropsAreEqual(prev: QueueItemProps, next: QueueItemProps) {
  return (
    prev.item.id === next.item.id &&
    prev.item.title === next.item.title &&
    prev.item.artist === next.item.artist &&
    prev.index === next.index &&
    prev.isCurrent === next.isCurrent &&
    prev.onPress === next.onPress
  );
}

const QueueItem = memo(
  ({ item, index, isCurrent, onPress, onLongPress }: QueueItemProps) => (
    <TouchableOpacity
      onPress={() => onPress(index)}
      onLongPress={onLongPress}
      style={[
        styles.queueItem,
        isCurrent && styles.activeQueueItem,
      ]}
    >
      <MediaImage
        cover={item.cover}
        size="thumb"
        style={styles.artwork}
      />

      <View style={styles.metadata}>
        <Text
          style={[styles.title, isCurrent && styles.titleActive]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>

      <GripVertical color="#888" />
    </TouchableOpacity>
  ),
  queueItemPropsAreEqual
);

const Queue: React.FC<{ onBack: () => void; width: number }> = ({
  onBack,
  width,
}) => {
  const { t } = useTranslation();
  const {
    getQueue,
    currentSong,
    skipTo,
    moveTrack,
    isPlaying,
    pauseSong,
    resumeSong,
    skipToNext,
    queueVersion,
  } = usePlaying();

  const { albums } = useAlbums();
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<Song[]>([]);

  useEffect(() => {
    setQueue(getQueue());
  }, [queueVersion]);

  const currentAlbum = useMemo(
    () =>
      albums.find(
        album => album.id === currentSong?.albumId
      ),
    [albums, currentSong?.albumId]
  );

  const handleSongClick = useCallback(
    (index: number) => {
      skipTo(index);
    },
    [skipTo]
  );

  const handleDragEnd = useCallback(
    ({ data, from, to }: { data: Song[]; from: number; to: number }) => {
      setQueue(data);
      moveTrack(from, to);
    },
    [moveTrack]
  );

  const renderItem = useCallback(
    ({
      item,
      getIndex,
      drag,
      isActive,
    }: {
      item: Song;
      getIndex: () => number | undefined;
      drag: () => void;
      isActive: boolean;
    }) => {
      const index = getIndex() ?? 0;
      return (
        <QueueItem
          item={item}
          index={index}
          isCurrent={item.id === currentSong?.id}
          onPress={handleSongClick}
          onLongPress={drag}
        />
      );
    },
    [currentSong?.id, handleSongClick]
  );

  return (
    <View style={[styles.container, { width }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        {currentSong && (
          <MediaImage
            cover={currentSong.cover}
            size="thumb"
            style={styles.headerImage}
          />
        )}

        <View style={styles.headerTextContainer}>
          <Text
            style={styles.nowPlayingTitle}
            numberOfLines={1}
          >
            {currentSong?.title}
          </Text>
          <Text
            style={styles.nowPlayingArtist}
            numberOfLines={1}
          >
            {currentSong?.artist}
          </Text>
        </View>

        <View style={styles.playControls}>
          <TouchableOpacity
            onPress={isPlaying ? pauseSong : resumeSong}
            style={styles.controlButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipToNext}
            style={styles.controlButton}
          >
            <Ionicons
              name="play-skip-forward"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('playing.queue.title')}</Text>
      <Text style={styles.subLabel}>
        {currentAlbum
          ? t('playing.queue.playingFromAlbum', { album: currentAlbum.title })
          : t('playing.queue.playingFromQueue')}
      </Text>

      {/* List */}
      <DraggableFlatList
        data={queue}
        keyExtractor={item => item.id}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 160,
        }}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },

  playControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  controlButton: {
    padding: 6,
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },

  headerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  nowPlayingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  nowPlayingArtist: {
    fontSize: 14,
    color: '#aaa',
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },

  subLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  activeQueueItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },

  metadata: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    color: '#fff',
  },

  titleActive: {
    fontWeight: '700',
  },

  artist: {
    fontSize: 14,
    color: '#aaa',
  },
});

export default Queue;