import { useEffect, useMemo, useRef, useState } from 'react';
import TrackPlayer, { BrowseCategory, BrowseItem } from '@rntp/player';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useLibrary } from '@/contexts/LibraryContext';
import { Album, AlbumBase, Playlist, Server, Song, SongBase } from '@/types';
import { buildCover } from '@/utils/builders/buildCover';
import { normalizeMediaUrl } from '@/utils/builders/buildTrackItem';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { createNavidromeClient } from '@/api/navidrome/client';
import { createJellyfinClient } from '@/api/jellyfin/client';
import { createEmbyClient } from '@/api/emby/client';

const CARPLAY_ALBUM_LIMIT = 50;
const CARPLAY_PLAYLIST_LIMIT = 50;
const CARPLAY_TRACK_LIMIT = 100;

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

function haveSamePlaylistIds(a: Playlist[], b: Playlist[]): boolean {
  return a.length === b.length && a.every((playlist, index) => playlist.id === b[index]?.id);
}

function isPlaylistDetail(playlist: Playlist | null): playlist is Playlist {
  return !!playlist && Array.isArray(playlist.songs);
}

function isAlbumDetail(album: Album | AlbumBase): album is Album {
  return 'songs' in album && Array.isArray(album.songs);
}

function buildStreamUrl(server: Server | null | undefined, songId: string): string | null {
  if (!server?.isAuthenticated) return null;

  if (server.type === 'navidrome') {
    const password = server.auth?.password;
    if (typeof password !== 'string') return null;
    return createNavidromeClient({
      serverUrl: server.serverUrl,
      username: server.username,
      password,
      basicAuth: server.basicAuth,
    }).buildStreamUrl(songId);
  }

  if (server.type === 'jellyfin') {
    const token = server.auth?.token;
    const userId = server.auth?.userId;
    if (typeof token !== 'string' || typeof userId !== 'string') return null;
    return createJellyfinClient({
      serverUrl: server.serverUrl,
      token,
      userId,
      basicAuth: server.basicAuth,
    }).buildStreamUrl(songId);
  }

  if (server.type === 'emby') {
    const token = server.auth?.token;
    const userId = server.auth?.userId;
    if (typeof token !== 'string' || typeof userId !== 'string') return null;
    return createEmbyClient({
      serverUrl: server.serverUrl,
      token,
      userId,
      basicAuth: server.basicAuth,
    }).buildStreamUrl(songId);
  }

  return null;
}

function toPlayableSong(track: SongBase, server: Server | null | undefined): Song | null {
  const streamUrl = buildStreamUrl(server, track.id);
  if (!streamUrl) return null;

  return {
    ...track,
    streamUrl,
    sourceServerId: server?.id,
    sourceServerType: server?.type,
  };
}

export function useCarPlayBrowseTree() {
  const queryClient = useQueryClient();
  const api = useApi();
  const apiRef = useRef(api);
  const activeServer = useSelector(selectActiveServer);
  const { albums, playlists, starred, tracks } = useLibrary();
  const [hydratedPlaylists, setHydratedPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const carPlayPlaylistKey = useMemo(
    () => playlists.slice(0, CARPLAY_PLAYLIST_LIMIT).map(playlist => playlist.id).join('|'),
    [playlists]
  );

  const tracksByAlbumId = useMemo(() => {
    const grouped = new Map<string, Song[]>();
    tracks.forEach(track => {
      const song = toPlayableSong(track, activeServer);
      if (!song) return;
      const existing = grouped.get(track.albumId) ?? [];
      existing.push(song);
      grouped.set(track.albumId, existing);
    });
    return grouped;
  }, [activeServer, tracks]);

  useEffect(() => {
    if (!activeServer?.id || !albums.length) return;

    const serverId = activeServer.id;
    const missingAlbums = albums
      .slice(0, CARPLAY_ALBUM_LIMIT)
      .filter(album => {
        const hasCached = !!queryClient.getQueryData<Album>([QueryKeys.Album, serverId, album.id]);
        const hasLibraryTracks = !!tracksByAlbumId.get(album.id)?.length;
        return !hasCached && !hasLibraryTracks;
      })
      .slice(0, 20);

    if (!missingAlbums.length) return;

    let cancelled = false;
    Promise.allSettled(
      missingAlbums.map(album =>
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Album, serverId, album.id],
          queryFn: () => apiRef.current.albums.get(album.id),
          staleTime: staleTime.albums,
        })
      )
    ).then(() => { if (!cancelled) { /* browse tree effect re-runs via queryClient cache */ } });

    return () => { cancelled = true; };
  }, [activeServer?.id, albums, queryClient, tracksByAlbumId]);

  useEffect(() => {
    if (!activeServer?.id || !playlists.length) {
      setHydratedPlaylists(current => current.length ? [] : current);
      return;
    }

    let cancelled = false;
    const serverId = activeServer.id;
    const carPlayPlaylists = playlists.slice(0, CARPLAY_PLAYLIST_LIMIT);
    const cachedPlaylists = carPlayPlaylists
      .map(playlist => queryClient.getQueryData<Playlist>([QueryKeys.Playlist, serverId, playlist.id]) ?? null)
      .filter((playlist): playlist is Playlist => isPlaylistDetail(playlist) && playlist.songs.length > 0);

    setHydratedPlaylists(current =>
      haveSamePlaylistIds(current, cachedPlaylists) ? current : cachedPlaylists
    );

    const missingPlaylists = carPlayPlaylists.filter(playlist => {
      const cached = queryClient.getQueryData<Playlist>([QueryKeys.Playlist, serverId, playlist.id]);
      return !(cached?.songs?.length);
    });

    if (!missingPlaylists.length) return;

    Promise.allSettled(
      missingPlaylists.map(playlist =>
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Playlist, serverId, playlist.id],
          queryFn: () => apiRef.current.playlists.get(playlist.id),
          staleTime: staleTime.playlists,
        })
      )
    ).then(results => {
      if (cancelled) return;
      const fetched = results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((playlist): playlist is Playlist => Boolean(playlist?.songs?.length));
      const nextPlaylists = [...cachedPlaylists, ...fetched];
      setHydratedPlaylists(current =>
        haveSamePlaylistIds(current, nextPlaylists) ? current : nextPlaylists
      );
    });

    return () => {
      cancelled = true;
    };
  }, [activeServer?.id, carPlayPlaylistKey, playlists, queryClient]);

  useEffect(() => {
    const serverId = activeServer?.id;
    const categories: BrowseCategory[] = [];

    const favoriteItems = starred
      .slice(0, 100)
      .map(toPlayableBrowseItem)
      .filter((item): item is BrowseItem => Boolean(item));
    if (favoriteItems.length) {
      categories.push({ mediaId: 'favorites', title: 'Favorites', items: favoriteItems });
    }

    const albumsWithCachedSongs = albums.map(album => (
      serverId
        ? queryClient.getQueryData<Album>([QueryKeys.Album, serverId, album.id]) ?? album
        : album
    ));

    const albumItems = albumsWithCachedSongs
      .slice(0, CARPLAY_ALBUM_LIMIT)
      .map((album): BrowseItem => {
        const detailSongs = isAlbumDetail(album) ? album.songs : undefined;
        const songs = detailSongs?.length
          ? detailSongs
          : tracksByAlbumId.get(album.id) ?? [];

        return {
          mediaId: `album-${album.id}`,
          title: album.title,
          artist: album.artist.name,
          artworkUrl: buildCover(album.cover, 'grid') ?? undefined,
          children: songs
            .slice(0, CARPLAY_TRACK_LIMIT)
            .map(toPlayableBrowseItem)
            .filter((item): item is BrowseItem => Boolean(item)),
        };
      })
      .filter(item => item.children?.length);
    if (albumItems.length) {
      categories.push({ mediaId: 'albums', title: 'Albums', items: albumItems });
    }

    const playlistItems = hydratedPlaylists
      .filter(playlist => playlist.songs?.length)
      .slice(0, CARPLAY_PLAYLIST_LIMIT)
      .map((playlist): BrowseItem => ({
        mediaId: `playlist-${playlist.id}`,
        title: playlist.title,
        artworkUrl: buildCover(playlist.cover, 'grid') ?? undefined,
        children: playlist.songs
          .slice(0, CARPLAY_TRACK_LIMIT)
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
  }, [activeServer?.id, albums, hydratedPlaylists, queryClient, starred, tracksByAlbumId]);
}
