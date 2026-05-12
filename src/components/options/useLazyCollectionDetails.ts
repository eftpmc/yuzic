import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { fetchAlbumDetailsSettled } from '@/hooks/albums';
import type { Album, AlbumBase, Playlist, PlaylistBase, Song } from '@/types';

export function hasAlbumSongs(album: AlbumBase | Album | null): album is Album {
  return !!album && 'songs' in album && Array.isArray(album.songs);
}

export function hasPlaylistSongs(playlist: PlaylistBase | Playlist | null): playlist is Playlist {
  return !!playlist && 'songs' in playlist && Array.isArray(playlist.songs);
}

export function useLazyAlbumDetail(album: AlbumBase | Album | null, isSheetOpen: boolean) {
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const [hydratedAlbum, setHydratedAlbum] = useState<Album | null>(null);
  const [songsLoading, setSongsLoading] = useState(false);

  const hasDetail = hasAlbumSongs(album);

  useEffect(() => {
    setHydratedAlbum(null);
  }, [album?.id]);

  useEffect(() => {
    if (!isSheetOpen || !album?.id || !activeServer?.id || hasDetail) {
      setSongsLoading(false);
      return;
    }

    let cancelled = false;
    setSongsLoading(true);

    queryClient.fetchQuery({
      queryKey: [QueryKeys.Album, activeServer.id, album.id],
      queryFn: () => api.albums.get(album.id),
      staleTime: staleTime.albums,
    })
      .then(fullAlbum => {
        if (!cancelled) setHydratedAlbum(fullAlbum);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSongsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeServer?.id, album?.id, api, hasDetail, isSheetOpen, queryClient]);

  const albumCandidate = hydratedAlbum ?? album;
  const albumWithSongs = hasAlbumSongs(albumCandidate) ? albumCandidate : null;

  return {
    albumWithSongs,
    songs: albumWithSongs?.songs ?? [],
    songsLoading,
  };
}

export function useLazyPlaylistDetail(
  playlist: PlaylistBase | Playlist | null,
  isSheetOpen: boolean
) {
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const [hydratedPlaylist, setHydratedPlaylist] = useState<Playlist | null>(null);
  const [songsLoading, setSongsLoading] = useState(false);

  const hasDetail = hasPlaylistSongs(playlist);

  useEffect(() => {
    setHydratedPlaylist(null);
  }, [playlist?.id]);

  useEffect(() => {
    if (!isSheetOpen || !playlist?.id || !activeServer?.id || hasDetail) {
      setSongsLoading(false);
      return;
    }

    let cancelled = false;
    setSongsLoading(true);

    queryClient.fetchQuery({
      queryKey: [QueryKeys.Playlist, activeServer.id, playlist.id],
      queryFn: () => api.playlists.get(playlist.id),
      staleTime: staleTime.playlists,
    })
      .then(fullPlaylist => {
        if (!cancelled) setHydratedPlaylist(fullPlaylist);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSongsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeServer?.id, api, hasDetail, isSheetOpen, playlist?.id, queryClient]);

  const playlistCandidate = hydratedPlaylist ?? playlist;
  const playlistWithSongs = hasPlaylistSongs(playlistCandidate) ? playlistCandidate : null;

  return {
    playlistWithSongs,
    songs: playlistWithSongs?.songs ?? [],
    songsLoading,
  };
}

export function useLazyArtistSongs(
  artistId: string | undefined,
  artistAlbums: AlbumBase[],
  isSheetOpen: boolean
) {
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);

  const albumIdsKey = useMemo(
    () => artistAlbums.map(album => album.id).join('|'),
    [artistAlbums]
  );

  useEffect(() => {
    if (!isSheetOpen || !artistId || !activeServer?.id || !artistAlbums.length) {
      setSongs(current => current.length ? [] : current);
      setSongsLoading(false);
      return;
    }

    let cancelled = false;
    setSongsLoading(true);

    fetchAlbumDetailsSettled({
      queryClient,
      serverId: activeServer.id,
      albums: artistAlbums,
      getAlbum: api.albums.get,
    })
      .then(fullAlbums => {
        if (!cancelled) setSongs(fullAlbums.flatMap(album => album.songs ?? []));
      })
      .catch(() => {
        if (!cancelled) setSongs(current => current.length ? [] : current);
      })
      .finally(() => {
        if (!cancelled) setSongsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeServer?.id, albumIdsKey, api, artistAlbums, artistId, isSheetOpen, queryClient]);

  return { songs, songsLoading };
}
