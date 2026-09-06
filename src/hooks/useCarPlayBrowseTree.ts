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
import type { ApiAdapter } from '@/api/types';
import { useStreamQuality } from './useStreamQuality';
import { selectPreferredCodec } from '@/utils/redux/selectors/settingsSelectors';
import type { AudioQuality, PreferredCodec } from '@/utils/redux/slices/settingsSlice';

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

/**
 * CarPlay needs a plain URL per row rather than a player call, so it builds one
 * up front for every track it lists.
 *
 * This used to construct a provider's client by hand, one branch per server
 * type, which meant a fourth server would have gone unplayable in the car until
 * someone remembered this file. The adapter already knows how to address a
 * stream on whichever server is active — including which URL failover last
 * confirmed alive — so it does it.
 *
 * Quality and codec are the user's, the same as on the phone. This asked for
 * `'high'` unconditionally for as long as it existed, so someone who chose
 * Original on WiFi still got a 320kbps stream the moment they got in the car —
 * the setting was derived inside PlayingContext and nowhere else, and this
 * file never saw it.
 */
function buildStreamUrl(
  api: ApiAdapter,
  server: Server | null | undefined,
  songId: string,
  quality: AudioQuality,
  codec: PreferredCodec
): string | null {
  if (!server?.isAuthenticated) return null;
  // Empty is what an adapter with nothing behind it returns.
  return api.songs.buildStreamUrl(songId, quality, codec) || null;
}

function toPlayableSong(
  api: ApiAdapter,
  track: SongBase,
  server: Server | null | undefined,
  quality: AudioQuality,
  codec: PreferredCodec
): Song | null {
  const streamUrl = buildStreamUrl(api, server, track.id, quality, codec);
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
  const streamQuality = useStreamQuality();
  const preferredCodec = useSelector(selectPreferredCodec);
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
      const song = toPlayableSong(api, track, activeServer, streamQuality, preferredCodec);
      if (!song) return;
      const existing = grouped.get(track.albumId) ?? [];
      existing.push(song);
      grouped.set(track.albumId, existing);
    });
    return grouped;
  }, [api, activeServer, tracks, streamQuality, preferredCodec]);

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
