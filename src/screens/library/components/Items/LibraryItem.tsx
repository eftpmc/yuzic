import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ellipsis } from 'lucide-react-native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { hitSlopFor, radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useListDensity } from '@/hooks/useListDensity';
import Touchable from '@/components/Touchable';

type Props = {
  cover: CoverSource;
  title: string;
  /**
   * The second line, or `undefined` for a row that has none.
   *
   * The distinction matters: an empty string still reserves the line, so a
   * track with no artist stays aligned with the tracks either side of it,
   * while `undefined` removes it — which is what a screen of nothing but
   * artists wants, since "Artist" under every name is the same word 26 times.
   */
  subtext?: string;
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const density = useListDensity();

  const listRadius = circularImage ? 26 : rad.md;
  const gridRadius = circularImage ? gridWidth / 2 : rad.card;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        isGridView
          ? [styles.gridContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing, borderRadius: rad.md }]
          : [styles.listContainer, { paddingVertical: density.libraryRowPadding }],
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
        {subtext !== undefined && (
          <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
            {subtext}
          </Text>
        )}
      </View>

      {!isGridView && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.rows.options', { title })}
          onPress={onLongPress}
          {...hitSlopFor(18)}
          feedback="control"
        >
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
    ...typography.caption,
    // Reserved rather than measured: a grid where one tile's artist is blank
    // and its neighbour's is not used to put the two titles on different
    // baselines, which reads as a layout bug rather than as missing data.
    minHeight: typography.caption.lineHeight,
  },
  pressed: {
    opacity: 0.9,
  },
});
