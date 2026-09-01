import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, radius, rowDensity, spacing, typography } from '@/constants/design';
import type { CoverSource } from '@/types';
import Touchable from '@/components/Touchable';

type Props = {
  title: string;
  subtitle?: string;
  cover: CoverSource;
  onPress?: () => void;
  disabled?: boolean;
  /** Rendered inside the touchable before the cover, e.g. a track index */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Rendered on the subtitle line after the text, e.g. status badges */
  subtitleTrailing?: React.ReactNode;
  roundedCover?: boolean;
  showCover?: boolean;
  variant?: 'default' | 'compact';
  rowStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export default function MediaListRow({
  title,
  subtitle,
  cover,
  onPress,
  disabled,
  leading,
  trailing,
  subtitleTrailing,
  roundedCover,
  showCover = true,
  variant = 'default',
  rowStyle,
  style,
}: Props) {
  const { colors } = useTheme();
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.row, isCompact && styles.compactRow, rowStyle]}>
        <Touchable
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? title : undefined}
          accessibilityState={{ disabled: disabled || !onPress }}
          style={styles.content}
          onPress={onPress}
          disabled={disabled || !onPress}
        >
          {leading}
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
              <View style={[styles.subtitleRow, isCompact ? styles.compactSubtitleSpacing : styles.subtitleSpacing]}>
                <Text
                  numberOfLines={1}
                  style={[
                    isCompact ? styles.compactSubtitleText : styles.subtitleText,
                    styles.subtitleFlex,
                    { color: colors.subtext },
                  ]}
                >
                  {subtitle}
                </Text>
                {subtitleTrailing}
              </View>
            )}
          </View>
        </Touchable>

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
    gap: spacing.rowGap,
    marginBottom: 16,
  },
  compactRow: rowDensity.compact,
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
  },
  subtitleSpacing: {
    marginTop: 2,
  },
  compactSubtitleSpacing: {
    marginTop: 1,
  },
  subtitleText: typography.rowSubtitle,
  compactSubtitleText: typography.compactRowSubtitle,
  subtitleFlex: {
    flex: 1,
  },
});
