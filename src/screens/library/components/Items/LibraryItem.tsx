import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  cover: CoverSource;
  title: string;
  subtext: string;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
  circularImage?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

const LibraryItem: React.FC<Props> = ({
  cover,
  title,
  subtext,
  isGridView,
  gridWidth,
  gridSpacing = 8,
  circularImage = false,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();

  const listRadius = circularImage ? 26 : 4;
  const gridRadius = circularImage ? gridWidth / 2 : 8;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        isGridView
          ? [styles.gridContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing }]
          : styles.listContainer,
        pressed && styles.pressed,
      ]}
    >
      <MediaImage
        cover={cover}
        size={isGridView ? 'grid' : 'thumb'}
        style={
          isGridView
            ? { width: gridWidth, aspectRatio: 1, borderRadius: gridRadius }
            : { width: 52, height: 52, borderRadius: listRadius, marginRight: 12 }
        }
      />

      <View style={isGridView ? styles.gridText : styles.listText}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
          {subtext}
        </Text>
      </View>

      {!isGridView && (
        <TouchableOpacity onPress={onLongPress} hitSlop={10}>
          <Ellipsis size={18} color={colors.subtext} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

export default memo(LibraryItem);

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridContainer: {
    borderRadius: 8,
  },
  listText: {
    flex: 1,
    marginRight: 12,
  },
  gridText: {
    marginTop: 6,
    width: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.9,
  },
});
