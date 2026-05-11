import { useEffect } from 'react';
import TrackPlayer, { BrowseCategory, BrowseItem } from '@rntp/player';
import { useLibrary } from '@/contexts/LibraryContext';
import { Song } from '@/types';
import { buildCover } from '@/utils/builders/buildCover';
import { normalizeMediaUrl } from '@/utils/builders/buildTrackItem';

function toPlayableBrowseItem(song: Song): BrowseItem | null {
  if (!song.streamUrl) return null;
  return {
    mediaId: song.id,
    title: song.title,
    artist: song.artist,
    artworkUrl: buildCover(song.cover, 'grid') ?? undefined,
    url: normalizeMediaUrl(song.streamUrl),
    duration: Number(song.duration) || undefined,
  };
}

export function useCarPlayBrowseTree() {
  const { albums, playlists, starred } = useLibrary();

  useEffect(() => {
    const categories: BrowseCategory[] = [];

    const favoriteItems = starred
      .slice(0, 100)
      .map(toPlayableBrowseItem)
      .filter((item): item is BrowseItem => Boolean(item));
    if (favoriteItems.length) {
      categories.push({ mediaId: 'favorites', title: 'Favorites', items: favoriteItems });
    }

    const albumItems = albums
      .filter(album => album.songs?.length)
      .slice(0, 50)
      .map((album): BrowseItem => ({
        mediaId: `album-${album.id}`,
        title: album.title,
        artist: album.artist.name,
        artworkUrl: buildCover(album.cover, 'grid') ?? undefined,
        children: album.songs
          .slice(0, 100)
          .map(toPlayableBrowseItem)
          .filter((item): item is BrowseItem => Boolean(item)),
      }))
      .filter(item => item.children?.length);
    if (albumItems.length) {
      categories.push({ mediaId: 'albums', title: 'Albums', items: albumItems });
    }

    const playlistItems = playlists
      .filter(playlist => playlist.songs?.length)
      .slice(0, 50)
      .map((playlist): BrowseItem => ({
        mediaId: `playlist-${playlist.id}`,
        title: playlist.title,
        artworkUrl: buildCover(playlist.cover, 'grid') ?? undefined,
        children: playlist.songs
          .slice(0, 100)
          .map(toPlayableBrowseItem)
          .filter((item): item is BrowseItem => Boolean(item)),
      }))
      .filter(item => item.children?.length);
    if (playlistItems.length) {
      categories.push({ mediaId: 'playlists', title: 'Playlists', items: playlistItems });
    }

    try {
      TrackPlayer.setBrowseTree(categories.slice(0, 4));
    } catch {
      // best-effort
    }
  }, [albums, playlists, starred]);
}
