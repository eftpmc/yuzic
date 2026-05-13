import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MediaImage } from "@/components/MediaImage";
import SongOptions from "@/components/options/SongOptions";
import PlaylistList from "@/components/PlaylistList";
import { usePlaying } from "@/contexts/PlayingContext";
import { Song, SongBase } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { toast } from "@backpackapp-io/react-native-toast";
import { useSheetRef } from '@/utils/useSheetRef';
import { usePlayableSongResolver } from '@/hooks/songs';

type Props = {
  song: SongBase;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
};

const SHEET_TRANSITION_DELAY_MS = 180;
const PRESS_COOLDOWN_MS = 700;
const FULL_TRACK_FETCH_TIMEOUT_MS = 3000;

const TrackItem: React.FC<Props> = ({
  song,
  isGridView,
  gridWidth,
  gridSpacing = 8,
}) => {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { playSimilar, playSong } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();

  const optionsRef = useSheetRef();
  const playlistRef = useSheetRef();
  const sheetOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressInFlightRef = useRef(false);
  const longPressInFlightRef = useRef(false);
  const lastPressAtRef = useRef(0);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePress = async () => {
    const now = Date.now();
    if (now - lastPressAtRef.current < PRESS_COOLDOWN_MS) return;
    if (pressInFlightRef.current) return;
    lastPressAtRef.current = now;
    pressInFlightRef.current = true;
    try {
      const fullSong = await resolvePlayableSong(song, { timeoutMs: FULL_TRACK_FETCH_TIMEOUT_MS });
      if (!fullSong) return;
      if (fullSong.filePath) {
        await playSong(fullSong);
        return;
      }
      // Let press feedback/render settle before starting playback work.
      await new Promise<void>((resolve) =>
        InteractionManager.runAfterInteractions(() => resolve())
      );
      await playSimilar(fullSong);
    } catch (error) {
      console.warn("Failed to play home track", error);
      toast.error(t("common.playbackError"));
    } finally {
      pressInFlightRef.current = false;
    }
  };

  const handleLongPress = async () => {
    if (longPressInFlightRef.current) return;
    longPressInFlightRef.current = true;
    try {
      const fullSong = await resolvePlayableSong(song, { timeoutMs: FULL_TRACK_FETCH_TIMEOUT_MS });
      if (fullSong) {
        setSelectedSong(fullSong);
        optionsRef.current?.present();
      }
    } catch (error) {
      console.warn("Failed to fetch full track data", error);
      toast.error(t("common.songDetailsError"));
    } finally {
      longPressInFlightRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (sheetOpenTimerRef.current) clearTimeout(sheetOpenTimerRef.current);
    };
  }, []);

  const openPlaylistList = () => {
    if (!selectedSong) return;
    setPlaylistSong(selectedSong);
    sheetOpenTimerRef.current = setTimeout(() => {
      playlistRef.current?.present();
    }, SHEET_TRANSITION_DELAY_MS);
  };

  const closePlaylistList = () => {
    setPlaylistSong(null);
  };

  return (
    <>
      <Pressable
        accessibilityLabel={`Track ${song.title}`}
        accessibilityRole="button"
        testID="library-track-item"
        onPress={() => {
          void handlePress();
        }}
        onLongPress={() => {
          void handleLongPress();
        }}
        delayLongPress={300}
        style={({ pressed }) => [
          isGridView
            ? [
                styles.gridItemContainer,
                {
                  width: gridWidth,
                  marginHorizontal: gridSpacing,
                  marginVertical: gridSpacing,
                },
              ]
            : styles.itemContainer,
          pressed && styles.pressed,
        ]}
      >
        <MediaImage
          cover={song.cover}
          size={isGridView ? "grid" : "thumb"}
          style={
            isGridView
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
              : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
          }
        />

        <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={[styles.subtext, isDarkMode && styles.subtextDark]} numberOfLines={1}>
            {song.artist}
            {!isGridView ? ` • ${formatDuration(Number(song.duration))}` : ""}
          </Text>
        </View>

        {!isGridView && (
          <TouchableOpacity
            onPress={() => {
              void handleLongPress();
            }}
            hitSlop={10}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={isDarkMode ? "#fff" : "#000"}
            />
          </TouchableOpacity>
        )}
      </Pressable>

      {selectedSong && (
        <SongOptions
          ref={optionsRef}
          selectedSong={selectedSong}
          onAddToPlaylist={openPlaylistList}
        />
      )}

      <PlaylistList
        ref={playlistRef}
        selectedSong={playlistSong}
        onClose={closePlaylistList}
      />
    </>
  );
};

export default TrackItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridItemContainer: {
    alignItems: "flex-start",
    borderRadius: 8,
  },
  gridTextContainer: {
    marginTop: 4,
    width: "100%",
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  titleDark: {
    color: "#e6e6e6",
  },
  subtext: {
    fontSize: 14,
    color: "#666",
  },
  subtextDark: {
    color: "#aaa",
  },
  pressed: {
    opacity: 0.9,
  },
});
