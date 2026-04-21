import { useCallback } from 'react';
import { usePlaying } from '@/contexts/PlayingContext';
import { ExternalSong } from '@/types';
import type { Song, Playlist } from '@/types';

export function externalSongToTrack(song: ExternalSong, previewUrl: string): Song {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    artistId: '',
    cover: song.cover,
    duration: '30',
    albumId: song.albumId,
    streamUrl: previewUrl,
    isPreview: true,
  };
}

export function usePreviewPlayer() {
  const { playSong, playSongInCollection, pauseSong, resumeSong, addToQueue, playNext, currentSong, isPlaying: mainIsPlaying } = usePlaying();

  /** Play a single preview (no album context). */
  const toggle = useCallback(async (song: ExternalSong, url: string) => {
    if (currentSong?.id === song.id) {
      if (mainIsPlaying) await pauseSong();
      else await resumeSong();
    } else {
      await playSong(externalSongToTrack(song, url));
    }
  }, [currentSong, mainIsPlaying, playSong, pauseSong, resumeSong]);

  /**
   * Play a preview song in the context of its album — puts all preview tracks
   * from the album into the queue so skip-next/prev work across the album.
   */
  const toggleInAlbum = useCallback(async (
    song: ExternalSong,
    url: string,
    albumPreviewSongs: Song[],
    albumId: string,
    albumTitle: string,
  ) => {
    if (currentSong?.id === song.id) {
      if (mainIsPlaying) await pauseSong();
      else await resumeSong();
      return;
    }
    const track = externalSongToTrack(song, url);
    if (albumPreviewSongs.length <= 1) {
      await playSong(track);
      return;
    }
    const collection: Playlist = {
      id: albumId,
      title: albumTitle,
      cover: albumPreviewSongs[0]?.cover ?? { kind: 'none' },
      subtext: '',
      changed: new Date(),
      created: new Date(),
      songs: albumPreviewSongs,
    };
    await playSongInCollection(track, collection);
  }, [currentSong, mainIsPlaying, playSong, playSongInCollection, pauseSong, resumeSong]);

  const addPreviewToQueue = useCallback((song: ExternalSong, url: string) => {
    addToQueue(externalSongToTrack(song, url));
  }, [addToQueue]);

  const playPreviewNext = useCallback((song: ExternalSong, url: string) => {
    playNext(externalSongToTrack(song, url));
  }, [playNext]);

  return { toggle, toggleInAlbum, addPreviewToQueue, playPreviewNext };
}
