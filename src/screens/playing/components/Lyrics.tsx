import React, {
  memo,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { useProgress } from "react-native-track-player";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LyricsResult } from "@/api/types";

type Props = {
  lyrics: LyricsResult;
  width: number;
};

const BOTTOM_CONTROLS_HEIGHT = 120;

const Lyrics: React.FC<Props> = ({ lyrics, width }) => {
  const { position } = useProgress(250);
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<Record<number, { y: number; height: number }>>(
    {}
  );

  const [viewportHeight, setViewportHeight] = useState(0);

  const lines = useMemo(() => lyrics.lines, [lyrics]);

  const currentLineIndex = useMemo(() => {
    const timeMs = position * 1000;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (timeMs >= lines[i].startMs) return i;
    }
    return 0;
  }, [position, lines]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  };

  const onLineLayout =
    (index: number) => (e: LayoutChangeEvent) => {
      if (lineLayouts.current[index]) return;
      lineLayouts.current[index] = {
        y: e.nativeEvent.layout.y,
        height: e.nativeEvent.layout.height,
      };
    };

  const getTargetScrollY = () => {
    const layout = lineLayouts.current[currentLineIndex];
    if (!layout || viewportHeight === 0) return null;

    const usableHeight =
      viewportHeight -
      BOTTOM_CONTROLS_HEIGHT -
      insets.bottom;

    const centerY = usableHeight / 2;

    return layout.y + layout.height / 2 - centerY;
  };

  useEffect(() => {
    if (!scrollRef.current) return;

    const target = getTargetScrollY();
    if (target === null) return;

    scrollRef.current.scrollTo({
      y: Math.max(0, target),
      animated: true,
    });
  }, [currentLineIndex, viewportHeight, insets.bottom]);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          paddingTop:
            insets.top +
            (Platform.OS === "android" ? 48 : 12),
        },
      ]}
      onLayout={onContainerLayout}
    >
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_CONTROLS_HEIGHT + insets.bottom },
        ]}
      >
        {lines.map((line, index) => {
          const isActive = index === currentLineIndex;

          return (
            <View key={index} onLayout={onLineLayout(index)}>
              <Text
                style={[
                  styles.line,
                  isActive
                    ? styles.activeLine
                    : styles.inactiveLine,
                ]}
              >
                {line.text}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default memo(Lyrics);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: BOTTOM_CONTROLS_HEIGHT,
  },
  line: {
    textAlign: "center",
    marginVertical: 12,
    fontWeight: "700",
    fontSize: 26,
  },
  inactiveLine: {
    color: "#666",
    opacity: 0.6,
  },
  activeLine: {
    color: "#fff",
    opacity: 1,
  },
});