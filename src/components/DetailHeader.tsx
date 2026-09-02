import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaImage } from '@/components/MediaImage';
import { useCoverAccent } from '@/features/theme/useCoverAccent';
import { ACCENT_WASH_LOCATIONS, accentWashColors } from '@/features/theme/coverAccent';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, radius, spacing, typography } from '@/constants/design';
import type { CoverSource } from '@/types';
import Touchable from '@/components/Touchable';

/** How far the wash reaches past the top of the hero, before the safe-area and
 * bar height that sit above the cover are added to it. */
const WASH_REACH = 420;

const TITLE_FADE_MS = 180;

/** The floating bar's own height, below the status bar. Exported so a screen
 * can put something (a status banner) directly under it. */
export const DETAIL_BAR_HEIGHT = controlSize.topBarHeight;

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

/**
 * What a floating bar needs from the screen under it: whether the hero title
 * has scrolled away, and somewhere for that title to report where it is.
 *
 * Null on a screen with no hero — a plain list keeps a plain, always-titled
 * bar, because there is nothing else on it saying where you are.
 */
type DetailScrollValue = {
  /** 0 while the hero title is on screen, 1 once it is behind the bar. A shared
   * value rather than a boolean prop, so crossing the threshold fades the bar
   * on the UI thread without re-rendering anything inside it. */
  progress: SharedValue<number>;
  onHeroTitleLayout: (event: LayoutChangeEvent) => void;
};

const DetailScrollContext = createContext<DetailScrollValue | null>(null);

type DetailScreenProps = {
  /** The floating bar, rendered over the list rather than above it. */
  bar: React.ReactNode;
  children: (scroll: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  }) => React.ReactNode;
};

/**
 * A detail screen: a scrolling body with a bar floating over it.
 *
 * The bar used to sit *above* the list, on an opaque background, which put a
 * hard black edge across the top of every cover wash — the one thing a wash
 * must not have. Floating it lets the colour run to the top of the screen and
 * under the status bar, and lets the bar stay out of the way until there is a
 * reason for it: the title appears only once the hero's own title has scrolled
 * under it, so the screen never says the same name twice.
 */
export function DetailScreen({ bar, children }: DetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [titleVisible, setTitleVisible] = useState(false);

  // The scroll offset past which the hero title is behind the bar. Infinite
  // until the hero has laid out, so nothing shows before it is known.
  const revealAt = useRef(Number.POSITIVE_INFINITY);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(titleVisible ? 1 : 0, { duration: TITLE_FADE_MS });
  }, [titleVisible, progress]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const onHeroTitleLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    revealAt.current = y + height - insets.top - DETAIL_BAR_HEIGHT;
  }, [insets.top]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Setting the same boolean is a no-op in React, so this re-renders on the
    // two frames the threshold is crossed rather than on every scroll event.
    setTitleVisible(event.nativeEvent.contentOffset.y > revealAt.current);
  }, []);

  const scroll = useMemo(
    () => ({ progress, onHeroTitleLayout }),
    [progress, onHeroTitleLayout]
  );

  return (
    <DetailScrollContext.Provider value={scroll}>
      <View style={styles.screen}>
        {children({ onScroll, scrollEventThrottle: 16 })}
        <View
          pointerEvents="box-none"
          style={[styles.floatingBar, { paddingTop: insets.top }]}
        >
          {/* The whole overlay, status-bar strip included — painting only the
              bar left that strip transparent, so a scrolled list showed
              through above an otherwise solid header. */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.background },
              fadeStyle,
            ]}
          />
          {bar}
        </View>
      </View>
    </DetailScrollContext.Provider>
  );
}

export function DetailHeaderBar({ title, subtitle, rightAction }: DetailHeaderBarProps) {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();
  const floating = useContext(DetailScrollContext);

  const fallback = useSharedValue(1);
  const progress = floating?.progress ?? fallback;
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    // Only the two buttons take touches. The bar floats over a scrolling list,
    // and a plain view across the top of it would swallow every drag that
    // started in that strip.
    <View pointerEvents="box-none" style={styles.headerRow}>
      <BarButton
        testID="detail-back-button"
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
        scrim={floating ? (isDarkMode ? SCRIM_DARK : SCRIM_LIGHT) : undefined}
      >
        {/* A chevron's ink is a "<": its geometric centre sits right of where
            the eye puts it, so centring it in the disc reads as pushed over. */}
        <ChevronLeft size={24} color={colors.secondary} style={styles.chevron} />
      </BarButton>

      <Animated.View pointerEvents="none" style={[styles.headerTitleWrapper, fadeStyle]}>
        <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>

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
  const insets = useSafeAreaInsets();
  const accent = useCoverAccent(cover);
  const floating = useContext(DetailScrollContext);

  // The hero starts at the very top of the scroll view so the wash can too;
  // the room the bar and the status bar need is padding here instead.
  const inset = floating ? insets.top + DETAIL_BAR_HEIGHT : 0;

  return (
    <View style={[styles.container, { paddingTop: inset }]}>
      {/* A wash of the cover's own colour behind it, fading out before the
          content below. Absolute and non-interactive so nothing here has to
          move to make room for it, and absent until extraction returns rather
          than flashing a placeholder band on the way to the real colour. */}
      {accent ? (
        <LinearGradient
          pointerEvents="none"
          colors={accentWashColors(accent)}
          locations={[...ACCENT_WASH_LOCATIONS]}
          style={[styles.wash, { height: inset + WASH_REACH }]}
        />
      ) : null}

      {showNavigation && <DetailHeaderBar title={title} rightAction={rightAction} />}

      <View style={styles.coverWrapper}>
        <MediaImage cover={cover} size="detail" style={styles.coverImage} />
      </View>

      <View style={styles.titleInfo} onLayout={floating?.onHeroTitleLayout}>
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

/**
 * Room at the top of a hero that draws its own art, for the floating bar and
 * the status bar above it.
 *
 * The artist header bleeds a blurred cover to the edges instead of using
 * `DetailHeader`, and has to leave the same gap.
 */
export function useDetailHeaderInset(): number {
  const insets = useSafeAreaInsets();
  const floating = useContext(DetailScrollContext);
  return floating ? insets.top + DETAIL_BAR_HEIGHT : 0;
}

/**
 * `onLayout` for a hero's own title, so the floating bar knows when to show
 * its copy of it. Undefined outside a `DetailScreen`, where there is no bar
 * waiting on it.
 */
export function useDetailHeroTitleLayout(): ((event: LayoutChangeEvent) => void) | undefined {
  return useContext(DetailScrollContext)?.onHeroTitleLayout;
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

/**
 * The scrim behind a bar icon.
 *
 * A bare glyph on a floating bar has to stay readable over whatever the cover
 * turns out to be, and the cover is a different colour on every screen. A disc
 * the opposite side of the theme from the icon settles it once, for every
 * cover, without the icon having to change colour halfway through a scroll.
 */
const SCRIM_DARK = 'rgba(0, 0, 0, 0.35)';
const SCRIM_LIGHT = 'rgba(255, 255, 255, 0.6)';

type BarButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  scrim?: string;
};

function BarButton({ children, onPress, accessibilityLabel, testID, scrim }: BarButtonProps) {
  return (
    <Touchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.headerButton, scrim ? { backgroundColor: scrim } : null]}
      feedback="control"
      hitSlop={8}
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
  const { isDarkMode } = useTheme();
  const floating = useContext(DetailScrollContext);
  return (
    <BarButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      scrim={floating ? (isDarkMode ? SCRIM_DARK : SCRIM_LIGHT) : undefined}
    >
      {children}
    </BarButton>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  floatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    height: DETAIL_BAR_HEIGHT,
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
  chevron: {
    marginLeft: -2,
  },
  headerButton: {
    width: controlSize.iconCompact,
    height: controlSize.iconCompact,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
