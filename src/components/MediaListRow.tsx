import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, radius, spacing, typography } from '@/constants/design';
import type { CoverSource } from '@/types';

type Props = {
  title: string;
  subtitle?: string;
  cover: CoverSource;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
  roundedCover?: boolean;
  showCover?: boolean;
  variant?: 'default' | 'compact';
  contentStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export default function MediaListRow({
  title,
  subtitle,
  cover,
  onPress,
  disabled,
  trailing,
  roundedCover,
  showCover = true,
  variant = 'default',
  contentStyle,
  rowStyle,
  style,
}: Props) {
  const { colors } = useTheme();
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.row, isCompact && styles.compactRow, rowStyle]}>
        <TouchableOpacity
          style={[styles.content, contentStyle]}
          onPress={onPress}
          disabled={disabled || !onPress}
          activeOpacity={disabled ? 1 : 0.7}
        >
          {showCover && (
            <MediaImage
              cover={cover}
              size={isCompact ? 'thumb' : 'grid'}
              style={[
                styles.cover,
                isCompact && styles.compactCover,
                roundedCover && (isCompact ? styles.compactCoverRounded : styles.coverRounded),
              ]}
            />
          )}

          <View style={[styles.textContainer, !showCover && styles.textContainerNoCover]}>
            <Text
              numberOfLines={1}
              style={[isCompact ? styles.compactTitle : styles.title, { color: colors.secondary }]}
            >
              {title}
            </Text>

            {subtitle !== undefined && (
              <Text
                numberOfLines={1}
                style={[isCompact ? styles.compactSubtitle : styles.subtitle, { color: colors.subtext }]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.page,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactRow: {
    marginBottom: 0,
    paddingVertical: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: controlSize.mediaRowArt,
    height: controlSize.mediaRowArt,
    borderRadius: radius.thumb,
  },
  compactCover: {
    width: controlSize.compactMediaRowArt,
    height: controlSize.compactMediaRowArt,
  },
  coverRounded: {
    borderRadius: controlSize.mediaRowArt / 2,
  },
  compactCoverRounded: {
    borderRadius: controlSize.compactMediaRowArt / 2,
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.rowGap,
  },
  textContainerNoCover: {
    marginLeft: 0,
  },
  title: typography.rowTitle,
  compactTitle: typography.compactRowTitle,
  subtitle: {
    ...typography.rowSubtitle,
    marginTop: 2,
  },
  compactSubtitle: {
    ...typography.compactRowSubtitle,
    marginTop: 1,
  },
});
