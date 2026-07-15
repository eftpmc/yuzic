import React, { memo, useRef } from "react";
import { InteractionManager } from "react-native";
import { useSongActionSheets } from '@/contexts/SongActionSheetContext';
import { usePlaying } from "@/contexts/PlayingContext";
import { SongBase } from "@/types";
import { useTranslation } from "react-i18next";
import { toast } from "@backpackapp-io/react-native-toast";
import { usePlayableSongResolver } from '@/hooks/songs';
import { FULL_TRACK_FETCH_TIMEOUT_MS, TRACK_PRESS_COOLDOWN_MS } from '@/constants/playback';
import LibraryItem from './LibraryItem';

type Props = {
  song: SongBase;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
};

const TrackItem: React.FC<Props> = ({ song, isGridView, gridWidth, gridSpacing }) => {
  const { t } = useTranslation();
  const { playSimilar, playSong } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const { openSongOptions } = useSongActionSheets();

  const pressInFlightRef = useRef(false);
  const longPressInFlightRef = useRef(false);
  const lastPressAtRef = useRef(0);

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePress = async () => {
    const now = Date.now();
    if (now - lastPressAtRef.current < TRACK_PRESS_COOLDOWN_MS) return;
    if (pressInFlightRef.current) return;
    lastPressAtRef.current = now;
    pressInFlightRef.current = true;
    try {
      const fullSong = await resolvePlayableSong(song, { timeoutMs: FULL_TRACK_FETCH_TIMEOUT_MS });
      if (!fullSong) {
        toast.error(t("common.playbackError"));
        return;
      }
      if (fullSong.filePath) {
        await playSong(fullSong);
        return;
      }
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
        openSongOptions(fullSong);
      } else {
        toast.error(t("common.songDetailsError"));
      }
    } catch (error) {
      console.warn("Failed to fetch full track data", error);
      toast.error(t("common.songDetailsError"));
    } finally {
      longPressInFlightRef.current = false;
    }
  };

  const duration = Number(song.duration);
  const subtext = isGridView
    ? song.artist
    : `${song.artist}${duration ? ` • ${formatDuration(duration)}` : ""}`;

  return (
    <>
      <LibraryItem
        testID="library-track-item"
        cover={song.cover}
        title={song.title}
        subtext={subtext}
        isGridView={isGridView}
        gridWidth={gridWidth}
        gridSpacing={gridSpacing}
        onPress={() => { void handlePress(); }}
        onLongPress={() => { void handleLongPress(); }}
      />
    </>
  );
};

export default memo(TrackItem);
