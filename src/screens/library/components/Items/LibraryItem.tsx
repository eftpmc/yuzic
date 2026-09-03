import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import Touchable from '@/components/Touchable';

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
  testID?: string;
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
  testID,
}) => {
  const { colors } = useTheme();
  const rad = useRadius();

  const listRadius = circularImage ? 26 : 4;
  const gridRadius = circularImage ? gridWidth / 2 : 8;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        isGridView
          ? [styles.gridContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing, borderRadius: rad.md }]
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
            : { width: 52, height: 52, borderRadius: listRadius, marginRight: spacing.md }
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
        <Touchable onPress={onLongPress} hitSlop={10} feedback="control">
          <Ellipsis size={18} color={colors.subtext} />
        </Touchable>
      )}
    </Pressable>
  );
};

export default memo(LibraryItem);

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.tight,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  gridContainer: {},
  listText: {
    flex: 1,
    marginRight: spacing.md,
  },
  gridText: {
    marginTop: spacing.tight,
    width: '100%',
  },
  title: {
    ...typography.compactRowTitle,
  },
  subtext: {
    ...typography.compactRowSubtitle,
  },
  pressed: {
    opacity: 0.9,
  },
});
