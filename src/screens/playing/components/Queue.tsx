import React, { useState, useCallback, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GripVertical, ChevronLeft, Pause, Play, SkipForward } from 'lucide-react-native';
import { usePlayingState, usePlayingActions, usePlayingQueueVersion } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectAlbumsById } from '@/utils/redux/selectors/librarySelectors';
import { Song } from '@/types';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

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
    <Touchable
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
    </Touchable>
  ),
  queueItemPropsAreEqual
);

QueueItem.displayName = 'QueueItem';

const Queue: React.FC<{ onBack: () => void; width: number }> = ({
  onBack,
  width,
}) => {
  const { t } = useTranslation();
  const { currentSong, isPlaying } = usePlayingState();
  const { getQueue, skipTo, moveTrack, pauseSong, resumeSong, skipToNext } = usePlayingActions();
  const queueVersion = usePlayingQueueVersion();

  const albumsById = useSelector(selectAlbumsById);
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<Song[]>([]);

  useEffect(() => {
    setQueue(getQueue());
  }, [getQueue, queueVersion]);

  const currentAlbum = currentSong?.albumId ? albumsById.get(currentSong.albumId) : undefined;

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
    <View testID="playing-queue" style={[styles.container, { width }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Touchable
          testID="queue-back-button"
          accessibilityRole="button"
          accessibilityLabel="Back to player"
          onPress={onBack}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color="#fff" />
        </Touchable>

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
          <Touchable
            onPress={isPlaying ? pauseSong : resumeSong}
            style={styles.controlButton}
          >
            {isPlaying
              ? <Pause size={20} color="#fff" fill="#fff" />
              : <Play size={20} color="#fff" fill="#fff" />
            }
          </Touchable>

          <Touchable
            onPress={skipToNext}
            style={styles.controlButton}
          >
            <SkipForward size={20} color="#fff" fill="#fff" />
          </Touchable>
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
    borderRadius: radius.md,
  },

  headerImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  nowPlayingTitle: {
    ...typography.navigationTitle,
    fontWeight: '500',
    color: '#fff',
  },

  nowPlayingArtist: {
    ...typography.rowSubtitle,
    color: '#aaa',
  },

  sectionLabel: {
    ...typography.rowTitle,
    color: '#fff',
    marginBottom: 2,
  },

  subLabel: {
    ...typography.caption,
    color: '#888',
    marginBottom: 12,
  },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },

  activeQueueItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  artwork: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    marginRight: 12,
  },

  metadata: {
    flex: 1,
  },

  title: {
    ...typography.body,
    color: '#fff',
  },

  titleActive: {
    fontWeight: '500',
  },

  artist: {
    ...typography.rowSubtitle,
    color: '#aaa',
  },
});

export default Queue;
