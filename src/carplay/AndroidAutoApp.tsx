import React, { useEffect, useRef } from 'react';
import { AppRegistry } from 'react-native';
import { CarPlay, ListTemplate, TabBarTemplate } from 'react-native-carplay';
import { Provider } from 'react-redux';
import store from '@/utils/redux/store';
import { useApi } from '@/api';
import { PlayerQueue, TrackPlayer } from 'react-native-nitro-player';
import { buildTrackItem } from '@/utils/builders/buildTrackItem';

function AndroidAutoService() {
  const api = useApi();
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);

  useEffect(() => {
    let albumsCache: any[] = [];
    let playlistsCache: any[] = [];

    async function pushCollectionTemplate(id: string, type: 'album' | 'playlist') {
      try {
        const full = type === 'album'
          ? await apiRef.current.albums.get(id)
          : await apiRef.current.playlists.get(id);
        const songs = (full.songs ?? []).filter(
          (s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === s.id) === i
        );
        if (!songs.length) return;

        const songsTemplate = new ListTemplate({
          id: `aa-songs-${type}-${id}`,
          title: full.title,
          sections: [{
            items: [
              { id: 'action-play', text: 'Play All' },
              { id: 'action-shuffle', text: 'Shuffle' },
              ...songs.map((s: any) => ({ id: s.id, text: s.title, detailText: s.artist })),
            ],
          }],
          onItemSelect: async ({ index }: { index: number }) => {
            try {
              const startIdx = index <= 1 ? 0 : index - 2;
              const shouldShuffle = index === 1;
              let orderedSongs = [...songs];
              if (shouldShuffle) {
                for (let i = orderedSongs.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [orderedSongs[i], orderedSongs[j]] = [orderedSongs[j], orderedSongs[i]];
                }
              }
              const tracks = orderedSongs.map(buildTrackItem);
              const playlistId = await PlayerQueue.createPlaylist('AA Session');
              await PlayerQueue.addTracksToPlaylist(playlistId, tracks);
              await PlayerQueue.loadPlaylist(playlistId);
              await TrackPlayer.playSong(orderedSongs[startIdx].id, playlistId);
              await TrackPlayer.play();
            } catch {}
          },
        });
        CarPlay.pushTemplate(songsTemplate, true);
      } catch {}
    }

    async function onConnect() {
      try {
        const [albums, playlists] = await Promise.all([
          apiRef.current.albums.list(),
          apiRef.current.playlists.list(),
        ]);
        albumsCache = albums.slice(0, 20);
        playlistsCache = playlists.slice(0, 20);

        const albumsTemplate = new ListTemplate({
          id: 'aa-albums',
          title: 'Albums',
          sections: [{
            items: albumsCache.map((a: any) => ({
              id: a.id,
              text: a.title,
              detailText: a.subtext ?? '',
              showsDisclosureIndicator: true,
            })),
          }],
          onItemSelect: async ({ index }: { index: number }) => {
            const album = albumsCache[index];
            if (!album) return;
            await pushCollectionTemplate(album.id, 'album');
          },
        });

        const playlistsTemplate = new ListTemplate({
          id: 'aa-playlists',
          title: 'Playlists',
          sections: [{
            items: playlistsCache.map((p: any) => ({
              id: p.id,
              text: p.title,
              detailText: p.subtext ?? '',
              showsDisclosureIndicator: true,
            })),
          }],
          onItemSelect: async ({ index }: { index: number }) => {
            const pl = playlistsCache[index];
            if (!pl) return;
            await pushCollectionTemplate(pl.id, 'playlist');
          },
        });

        const tabBarTemplate = new TabBarTemplate({
          id: 'aa-tabs',
          templates: [albumsTemplate, playlistsTemplate],
          onTemplateSelect: () => {},
        });

        CarPlay.setRootTemplate(tabBarTemplate, false);
      } catch {}
    }

    CarPlay.registerOnConnect(onConnect);
    if (CarPlay.connected) onConnect();
    return () => {
      CarPlay.unregisterOnConnect(onConnect);
    };
  }, []);

  return null;
}

function AndroidAutoRoot() {
  return (
    <Provider store={store}>
      <AndroidAutoService />
    </Provider>
  );
}

AppRegistry.registerComponent('AndroidAuto', () => AndroidAutoRoot);

export default AndroidAutoRoot;
