import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { MediaImage } from '@/components/MediaImage';
import { useCoverAccent } from '@/features/theme/useCoverAccent';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, radius, spacing, typography } from '@/constants/design';
import type { CoverSource } from '@/types';
import Touchable from '@/components/Touchable';

type DetailHeaderProps = {
  title: string;
  cover: CoverSource;
  rightAction?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  showNavigation?: boolean;
};

type DetailHeaderBarProps = {
  title: string;
  /** A line under the title, for a screen whose only other heading would repeat
   * this one — a collection's item count rather than a second "Albums". */
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function DetailHeaderBar({ title, subtitle, rightAction }: DetailHeaderBarProps) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <View style={styles.headerRow}>
      <Touchable
        testID="detail-back-button"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
        style={styles.headerButton}
        feedback="control"
      >
        <ChevronLeft size={24} color={colors.secondary} />
      </Touchable>

      <View pointerEvents="none" style={styles.headerTitleWrapper}>
        <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ?? <View style={styles.headerButton} />}
    </View>
  );
}

export function DetailHeader({
  title,
  cover,
  rightAction,
  meta,
  status,
  actions,
  showNavigation = true,
}: DetailHeaderProps) {
  const { colors } = useTheme();
  const accent = useCoverAccent(cover);

  return (
    <View style={styles.container}>
      {/* A wash of the cover's own colour behind it, fading out before the
          content below. Absolute and non-interactive so nothing here has to
          move to make room for it, and absent until extraction returns rather
          than flashing a placeholder band on the way to the real colour. */}
      {accent ? (
        <LinearGradient
          pointerEvents="none"
          colors={[accent, 'transparent']}
          style={styles.wash}
        />
      ) : null}

      {showNavigation && <DetailHeaderBar title={title} rightAction={rightAction} />}

      <View style={styles.coverWrapper}>
        <MediaImage cover={cover} size="detail" style={styles.coverImage} />
      </View>

      <View style={styles.titleInfo}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
          {title}
        </Text>
        {meta}
      </View>

      {status}

      {actions}
    </View>
  );
}

type DetailMetaRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DetailMetaRow({ children, style }: DetailMetaRowProps) {
  return <View style={[styles.metaRow, style]}>{children}</View>;
}

export function DetailMetaDot() {
  const { colors } = useTheme();
  return (
    <Text style={[styles.metaDot, { color: colors.subtext }]} numberOfLines={1}>
      •
    </Text>
  );
}

type DetailMetaTextProps = {
  children: React.ReactNode;
};

export function DetailMetaText({ children }: DetailMetaTextProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
      {children}
    </Text>
  );
}

type DetailActionRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DetailActionRow({ children, style }: DetailActionRowProps) {
  return (
    <View style={[styles.actionsRow, style]}>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

type DetailCircleActionProps = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function DetailCircleAction({ children, onPress, disabled, style, accessibilityLabel }: DetailCircleActionProps) {
  const { colors } = useTheme();
  return (
    <Touchable
      style={[styles.secondaryButton, { backgroundColor: colors.card }, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {children}
    </Touchable>
  );
}

type DetailPlayActionProps = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function DetailPlayAction({ children, onPress, disabled, style, accessibilityLabel }: DetailPlayActionProps) {
  const { colors } = useTheme();
  return (
    <Touchable
      style={[styles.playButton, { backgroundColor: colors.themeColor }, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {children}
    </Touchable>
  );
}

type DetailHeaderIconButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function DetailHeaderIconButton({ children, onPress, accessibilityLabel = 'More options' }: DetailHeaderIconButtonProps) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.headerButton}
      feedback="control"
      hitSlop={8}
    >
      {children}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Past the cover and into the title, so the colour has somewhere to fade
    // rather than stopping on an edge.
    height: 420,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    width: '100%',
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.navigationTitle,
    maxWidth: '60%',
  },
  headerSubtitle: {
    ...typography.caption,
    maxWidth: '60%',
  },
  headerButton: {
    padding: spacing.tight,
    width: controlSize.iconCompact,
  },
  coverWrapper: {
    width: 280,
    height: 280,
    borderRadius: radius.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  titleInfo: {
    width: '100%',
    marginBottom: spacing.roomy,
    alignItems: 'center',
  },
  title: {
    ...typography.detailTitle,
    marginBottom: spacing.tight,
    textAlign: 'center',
  },
  subtext: {
    ...typography.rowSubtitle,
  },
  metaDot: {
    ...typography.rowSubtitle,
    marginHorizontal: spacing.tight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: spacing.xs,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.controlGap,
  },
  secondaryButton: {
    width: controlSize.detailSecondary,
    height: controlSize.detailSecondary,
    borderRadius: controlSize.detailSecondary / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    borderRadius: radius.pill,
    width: controlSize.detailPrimaryWidth,
    height: controlSize.detailPrimaryHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
