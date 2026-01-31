import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LyricsResult } from '@/api/types';

type Props = {
  lyrics: LyricsResult;
  position: number;
  contentWidth: number;
  isDarkMode: boolean;
  onPress: () => void;
};

const CARD_HEIGHT = 220;
const CARD_PADDING_V = 28;

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
  }, [variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle =
    variant === 'active'
      ? (isDarkMode ? styles.activeLineDark : styles.activeLineLight)
      : (isDarkMode ? styles.inactiveLineDark : styles.inactiveLineLight);

  return (
    <Animated.Text
      numberOfLines={2}
      style={[styles.line, baseStyle, animatedStyle]}
    >
      {text}
    </Animated.Text>
  );
}

export default function LyricsPreviewCard({
  lyrics,
  position,
  contentWidth,
  isDarkMode,
  onPress,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<Record<number, { y: number; height: number }>>({});
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const lines = lyrics.lines;
  const currentIndex = getCurrentLineIndex(lines, position);

  useEffect(() => {
    lineLayouts.current = {};
  }, [lyrics.lines]);

  const onLineLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    lineLayouts.current[index] = { y, height };
    if (index === currentIndex) {
      setLayoutVersion((v) => v + 1);
    }
  };

  useEffect(() => {
    if (!lines.length || !scrollRef.current) return;

    const layout = lineLayouts.current[currentIndex];
    if (!layout || contentHeight === 0) return;

    const visibleHeight = CARD_HEIGHT - CARD_PADDING_V * 2;
    const lineCenterY = layout.y + layout.height / 2;
    const targetScrollY = lineCenterY - visibleHeight / 2;
    const maxScroll = Math.max(0, contentHeight - visibleHeight);
    const clampedY = Math.max(0, Math.min(targetScrollY, maxScroll));

    scrollRef.current.scrollTo({
      y: clampedY,
      animated: true,
    });
  }, [currentIndex, lines.length, contentHeight, layoutVersion]);

  if (!lines.length) return null;

  const getVariant = (index: number): 'active' | 'adjacent' | 'inactive' => {
    if (index === currentIndex) return 'active';
    if (index === currentIndex - 1 || index === currentIndex + 1)
      return 'adjacent';
    return 'inactive';
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: contentWidth, height: CARD_HEIGHT },
        isDarkMode && styles.cardDark,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={(w, h) => setContentHeight(h)}
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
      </ScrollView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    paddingVertical: CARD_PADDING_V,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scrollContent: {
    paddingVertical: 4,
  },
  line: {
    textAlign: 'center',
    fontSize: 20,
    marginVertical: 6,
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
