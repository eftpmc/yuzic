import React, { memo, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import SongOptions from "@/components/options/SongOptions";
import PlaylistList from "@/components/PlaylistList";
import { usePlaying } from "@/contexts/PlayingContext";
import { Song, SongBase } from "@/types";
import { useTranslation } from "react-i18next";
import { toast } from "@backpackapp-io/react-native-toast";
import { useSheetRef } from '@/utils/useSheetRef';
import { usePlayableSongResolver } from '@/hooks/songs';
import LibraryItem from './LibraryItem';

type Props = {
  song: SongBase;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
};

const SHEET_TRANSITION_DELAY_MS = 180;
const PRESS_COOLDOWN_MS = 700;
const FULL_TRACK_FETCH_TIMEOUT_MS = 3000;

const TrackItem: React.FC<Props> = ({ song, isGridView, gridWidth, gridSpacing }) => {
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

  const closePlaylistList = () => setPlaylistSong(null);

  const duration = Number(song.duration);
  const subtext = isGridView
    ? song.artist
    : `${song.artist}${duration ? ` • ${formatDuration(duration)}` : ""}`;

  return (
    <>
      <LibraryItem
        cover={song.cover}
        title={song.title}
        subtext={subtext}
        isGridView={isGridView}
        gridWidth={gridWidth}
        gridSpacing={gridSpacing}
        onPress={() => { void handlePress(); }}
        onLongPress={() => { void handleLongPress(); }}
      />

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

export default memo(TrackItem);
