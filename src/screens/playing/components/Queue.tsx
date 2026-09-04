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
import { onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

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
  ({ item, index, isCurrent, onPress, onLongPress }: QueueItemProps) => {
    const rad = useRadius();
    return (
    <Touchable
      onPress={() => onPress(index)}
      onLongPress={onLongPress}
      style={[
        styles.queueItem,
        { borderRadius: rad.md },
        isCurrent && styles.activeQueueItem,
      ]}
    >
      <MediaImage
        cover={item.cover}
        size="thumb"
        style={[styles.artwork, { borderRadius: rad.md }]}
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

      <GripVertical color={onDark.mutedText} />
    </Touchable>
    );
  },
  queueItemPropsAreEqual
);

QueueItem.displayName = 'QueueItem';

const Queue: React.FC<{ onBack: () => void; width: number }> = ({
  onBack,
  width,
}) => {
  const { t } = useTranslation();
  const rad = useRadius();
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
          <ChevronLeft size={28} color={onDark.text} />
        </Touchable>

        {currentSong && (
          <MediaImage
            cover={currentSong.cover}
            size="thumb"
            style={[styles.headerImage, { borderRadius: rad.md }]}
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
            style={[styles.controlButton, { borderRadius: rad.md }]}
          >
            {isPlaying
              ? <Pause size={20} color={onDark.text} fill={onDark.text} />
              : <Play size={20} color={onDark.text} fill={onDark.text} />
            }
          </Touchable>

          <Touchable
            onPress={skipToNext}
            style={[styles.controlButton, { borderRadius: rad.md }]}
          >
            <SkipForward size={20} color={onDark.text} fill={onDark.text} />
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -8,
  },

  playControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },

  controlButton: {
    padding: spacing.tight,
    marginLeft: spacing.tight,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  headerImage: {
    width: 60,
    height: 60,
    marginRight: spacing.md,
  },

  headerTextContainer: {
    flex: 1,
  },

  nowPlayingTitle: {
    ...typography.navigationTitle,
    fontWeight: '500',
    color: onDark.text,
  },

  nowPlayingArtist: {
    ...typography.rowSubtitle,
    color: onDark.subtext,
  },

  sectionLabel: {
    ...typography.rowTitle,
    color: onDark.text,
    marginBottom: spacing.xxs,
  },

  subLabel: {
    ...typography.caption,
    color: onDark.mutedText,
    marginBottom: spacing.md,
  },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.controlGap,
    paddingHorizontal: spacing.md,
  },

  activeQueueItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  artwork: {
    width: 50,
    height: 50,
    marginRight: spacing.md,
  },

  metadata: {
    flex: 1,
  },

  title: {
    ...typography.body,
    color: onDark.text,
  },

  titleActive: {
    fontWeight: '500',
  },

  artist: {
    ...typography.rowSubtitle,
    color: onDark.subtext,
  },
});

export default Queue;
