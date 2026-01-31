import React, { forwardRef, useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaying } from '@/contexts/PlayingContext';
import { useTheme } from '@/hooks/useTheme';
import { LyricsResult } from '@/api/types';
import { ChevronDown } from 'lucide-react-native';

type LyricsBottomSheetProps = {
  lyrics: LyricsResult | null;
  onClose: () => void;
};

function getCurrentLineIndex(
  lines: { startMs: number }[],
  positionSeconds: number
): number {
  const timeMs = positionSeconds * 1000;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (timeMs >= lines[i].startMs) return i;
  }
  return 0;
}

function LyricLine({
  text,
  variant,
  isDarkMode,
}: {
  text: string;
  variant: 'active' | 'adjacent' | 'inactive';
  isDarkMode: boolean;
}) {
  const opacityTarget =
    variant === 'active' ? 1 : variant === 'adjacent' ? 0.85 : 0.5;
  const opacity = useSharedValue(opacityTarget);

  useEffect(() => {
    opacity.value = withTiming(opacityTarget, { duration: 240 });
  }, [variant, opacityTarget]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle =
    variant === 'active'
      ? (isDarkMode ? styles.activeLineDark : styles.activeLineLight)
      : (isDarkMode ? styles.inactiveLineDark : styles.inactiveLineLight);

  return (
    <Animated.Text
      numberOfLines={4}
      style={[styles.line, baseStyle, animatedStyle]}
    >
      {text}
    </Animated.Text>
  );
}

const LyricsBottomSheet = forwardRef<BottomSheetModal, LyricsBottomSheetProps>(
  ({ lyrics, onClose }, ref) => {
    const { isDarkMode } = useTheme();
    const { progress } = usePlaying();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<BottomSheetScrollView>(null);
    const lineLayouts = useRef<Record<number, { y: number; height: number }>>({});
    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [layoutVersion, setLayoutVersion] = useState(0);

    const lines = lyrics?.lines ?? [];
    const currentIndex = useMemo(
      () => getCurrentLineIndex(lines, progress.position),
      [lines, progress.position]
    );

    useEffect(() => {
      lineLayouts.current = {};
    }, [lyrics?.lines]);

    const onLineLayout = (index: number) => (e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      lineLayouts.current[index] = { y, height };
      if (index === currentIndex) {
        setLayoutVersion((v) => v + 1);
      }
    };

    useEffect(() => {
      if (!lines.length || !scrollRef.current || viewportHeight === 0) return;

      const layout = lineLayouts.current[currentIndex];
      if (!layout || contentHeight === 0) return;

      const padding = 80;
      const visibleHeight = viewportHeight - padding * 2;
      const lineCenterY = layout.y + layout.height / 2;
      const targetScrollY = lineCenterY - visibleHeight / 2;
      const maxScroll = Math.max(0, contentHeight - visibleHeight);
      const clampedY = Math.max(0, Math.min(targetScrollY, maxScroll));

      scrollRef.current.scrollTo({
        y: clampedY,
        animated: true,
      });
    }, [currentIndex, lines.length, contentHeight, viewportHeight, layoutVersion]);

    if (!lyrics) return null;

    const getVariant = (index: number): 'active' | 'adjacent' | 'inactive' => {
      if (index === currentIndex) return 'active';
      if (index === currentIndex - 1 || index === currentIndex + 1)
        return 'adjacent';
      return 'inactive';
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['90%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        stackBehavior="push"
        onDismiss={onClose}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#666' : '#ccc',
        }}
      >
        <View style={[styles.header, { paddingTop: 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ChevronDown size={28} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            Lyrics
          </Text>
          <View style={styles.closeButton} />
        </View>

        <BottomSheetScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: insets.bottom + 48,
            },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(w, h) => setContentHeight(h)}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        >
          {lines.map((line, index) => (
            <View key={index} onLayout={onLineLayout(index)}>
              <LyricLine
                text={line.text}
                variant={getVariant(index)}
                isDarkMode={isDarkMode}
              />
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

LyricsBottomSheet.displayName = 'LyricsBottomSheet';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  titleDark: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  line: {
    textAlign: 'center',
    fontSize: 24,
    marginVertical: 10,
    fontWeight: '500',
  },
  activeLineDark: {
    color: '#fff',
    fontWeight: '700',
  },
  activeLineLight: {
    color: '#000',
    fontWeight: '700',
  },
  inactiveLineDark: {
    color: '#999',
    fontWeight: '500',
  },
  inactiveLineLight: {
    color: '#666',
    fontWeight: '500',
  },
});

export default LyricsBottomSheet;
