import { useCallback } from 'react';
import { usePlaying } from '@/contexts/PlayingContext';
import { ExternalSong } from '@/types';
import type { Song } from '@/types';

export function usePreviewPlayer() {
  const { playSong, pauseSong, resumeSong, currentSong, isPlaying: mainIsPlaying } = usePlaying();

  const play = useCallback(async (song: ExternalSong, url: string) => {
    const track: Song = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: '',
      cover: song.cover,
      duration: song.duration,
      albumId: song.albumId,
      streamUrl: url,
    };
    await playSong(track);
  }, [playSong]);

  const toggle = useCallback(async (song: ExternalSong, url: string) => {
    if (currentSong?.id === song.id) {
      if (mainIsPlaying) await pauseSong();
      else await resumeSong();
    } else {
      await play(song, url);
    }
  }, [currentSong, mainIsPlaying, play, pauseSong, resumeSong]);

  return { toggle };
}
