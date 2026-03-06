import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { MediaImage } from "@/components/MediaImage";
import SongOptions from "@/components/options/SongOptions";
import PlaylistList from "@/components/PlaylistList";
import { usePlaying } from "@/contexts/PlayingContext";
import { Playlist, Song, SongBase } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { useApi } from "@/api";
import { toast } from "@backpackapp-io/react-native-toast";

type Props = {
  song: SongBase;
  visibleTracks: SongBase[];
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
};

const SHEET_TRANSITION_DELAY_MS = 180;
const MAX_VISIBLE_TRACKS_TO_RESOLVE = 80;

const TrackItem: React.FC<Props> = ({
  song,
  visibleTracks,
  isGridView,
  gridWidth,
  gridSpacing = 8,
}) => {
  const { isDarkMode } = useTheme();
  const api = useApi();
  const { playSongInCollection, playSong } = usePlaying();

  const optionsRef = useRef<BottomSheetModal>(null);
  const playlistRef = useRef<BottomSheetModal>(null);
  const pressInFlightRef = useRef(false);
  const longPressInFlightRef = useRef(false);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const resolveVisibleSongs = async (): Promise<Song[]> => {
    const uniqueIds = [...new Set(visibleTracks.map((track) => track.id))].slice(
      0,
      MAX_VISIBLE_TRACKS_TO_RESOLVE
    );
    const results = await Promise.allSettled(
      uniqueIds.map((id) => api.tracks.get(id))
    );

    const deduped = new Map<string, Song>();
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        deduped.set(result.value.id, result.value);
      }
    });
    return [...deduped.values()];
  };

  const handlePress = async () => {
    if (pressInFlightRef.current) return;
    pressInFlightRef.current = true;
    try {
      const fullSong = await api.tracks.get(song.id);
      if (!fullSong) return;

      const songs = await resolveVisibleSongs();
      if (!songs.length) {
        await playSong(fullSong);
        return;
      }

      if (!songs.some((item) => item.id === fullSong.id)) {
        songs.unshift(fullSong);
      }

      const collection: Playlist = {
        id: `home-tracks-${song.id}`,
        title: "Tracks",
        subtext: `Playlist • ${songs.length} songs`,
        cover: songs[0]?.cover ?? { kind: "none" },
        changed: new Date(0),
        created: new Date(0),
        songs,
      };

      await playSongInCollection(fullSong, collection);
    } catch (error) {
      console.warn("Failed to play home track", error);
      toast.error("Unable to start playback");
    } finally {
      pressInFlightRef.current = false;
    }
  };

  const handleLongPress = async () => {
    if (longPressInFlightRef.current) return;
    longPressInFlightRef.current = true;
    try {
      const fullSong = await api.tracks.get(song.id);
      if (!fullSong) return;
      setSelectedSong(fullSong);
      optionsRef.current?.present();
    } catch (error) {
      console.warn("Failed to open track options", error);
      toast.error("Unable to open track options");
    } finally {
      longPressInFlightRef.current = false;
    }
  };

  const openPlaylistList = () => {
    setPlaylistSong(selectedSong);
    setTimeout(() => {
      playlistRef.current?.present();
    }, SHEET_TRANSITION_DELAY_MS);
  };

  const closePlaylistList = () => {
    setPlaylistSong(null);
  };

  return (
    <>
      <Pressable
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
    borderRadius: 12,
  },
  gridItemContainer: {
    alignItems: "flex-start",
    borderRadius: 14,
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
