import { useEffect, useRef } from 'react';
import {
  CarPlay,
  ListTemplate,
  NowPlayingTemplate,
  TabBarTemplate,
} from 'react-native-carplay';
import { usePlaying } from '@/contexts/PlayingContext';
import { useApi } from '@/api';
import type { Album, Playlist } from '@/types';

export function CarPlayService() {
  const { playSongInCollection, toggleShuffle, toggleRepeat, shuffleOn, repeatOn } = usePlaying();
  const api = useApi();

  const playSongInCollectionRef = useRef(playSongInCollection);
  const toggleShuffleRef = useRef(toggleShuffle);
  const toggleRepeatRef = useRef(toggleRepeat);

  const shuffleOnRef = useRef(shuffleOn);
  const repeatOnRef = useRef(repeatOn);
  const apiRef = useRef(api);

  useEffect(() => { playSongInCollectionRef.current = playSongInCollection; }, [playSongInCollection]);
  useEffect(() => { toggleShuffleRef.current = toggleShuffle; }, [toggleShuffle]);
  useEffect(() => { toggleRepeatRef.current = toggleRepeat; }, [toggleRepeat]);

  useEffect(() => { shuffleOnRef.current = shuffleOn; }, [shuffleOn]);
  useEffect(() => { repeatOnRef.current = repeatOn; }, [repeatOn]);
  useEffect(() => { apiRef.current = api; }, [api]);

  useEffect(() => {
    let albumsCache: Album[] = [];
    let playlistsCache: Playlist[] = [];
    const fetchingIds = new Set<string>();

    // Shared helper — build and push a drilldown songs template
    async function pushCollectionTemplate(id: string, type: 'album' | 'playlist') {
      const key = `${type}-${id}`;
      if (fetchingIds.has(key)) return;
      fetchingIds.add(key);
      try {
        const full = type === 'album'
          ? await apiRef.current.albums.get(id)
          : await apiRef.current.playlists.get(id);
        const songs = full.songs ?? [];
        if (!songs.length) return;
        const uniqueSongs = songs.filter(
          (s, i, arr) => arr.findIndex(x => x.id === s.id) === i
        );
        const collection = { ...full, songs: uniqueSongs };
        const songsTemplate = new ListTemplate({
          id: `cp-songs-${type}-${id}`,
          title: full.title,
          sections: [{
            items: [
              { id: 'action-play', text: 'Play All' },
              { id: 'action-shuffle', text: 'Shuffle' },
              ...uniqueSongs.map(song => ({
                id: song.id,
                text: song.title,
                detailText: song.artist,
              })),
            ],
          }],
          onItemSelect: async ({ index }) => {
            try {
              if (index === 0) {
                await playSongInCollectionRef.current(uniqueSongs[0], collection);
              } else if (index === 1) {
                await playSongInCollectionRef.current(uniqueSongs[0], collection, true);
              } else {
                const song = uniqueSongs[index - 2];
                if (song) await playSongInCollectionRef.current(song, collection);
              }
            } catch {}
          },
        });
        CarPlay.pushTemplate(songsTemplate, true);
      } catch {}
      finally {
        fetchingIds.delete(key);
      }
    }

    async function onConnect() {
      const [albums, playlists] = await Promise.all([
        apiRef.current.albums.list(),
        apiRef.current.playlists.list(),
      ]);
      albumsCache = albums.slice(0, 20);
      playlistsCache = playlists.slice(0, 20);

      // Must instantiate NowPlayingTemplate BEFORE enableNowPlaying so the
      // shared CPNowPlayingTemplate.sharedTemplate gets its userInfo.templateId
      // set. Without this, the observer callbacks crash with nil templateId.
      //
      // Cover art is provided automatically by MPNowPlayingInfoCenter (nitro-player
      // updates this with MPMediaItemPropertyArtwork on every track change).
      //
      // Shuffle / Repeat buttons are system-drawn with their highlighted state
      // derived from onButtonPressed — we toggle state and CarPlay reflects it
      // via the standard CPNowPlayingButton active state.
      new NowPlayingTemplate({
        id: 'cp-nowplaying',
        buttons: [
          { id: 'cp-shuffle', type: 'shuffle' },
          { id: 'cp-repeat', type: 'repeat' },
        ],
        onButtonPressed: ({ id }) => {
          if (id === 'cp-shuffle') {
            toggleShuffleRef.current().catch(() => {});
          } else if (id === 'cp-repeat') {
            toggleRepeatRef.current();
          }
        },
      });

      const albumsTemplate = new ListTemplate({
        id: 'cp-albums',
        title: 'Albums',
        sections: [{
          items: albumsCache.map(album => ({
            id: album.id,
            text: album.title,
            detailText: album.subtext ?? '',
            showsDisclosureIndicator: true,
          })),
        }],
        onItemSelect: async ({ index }) => {
          const album = albumsCache[index];
          if (!album) return;
          await pushCollectionTemplate(album.id, 'album');
        },
      });

      const playlistsTemplate = new ListTemplate({
        id: 'cp-playlists',
        title: 'Playlists',
        sections: [{
          items: playlistsCache.map(playlist => ({
            id: playlist.id,
            text: playlist.title,
            detailText: playlist.subtext ?? '',
            showsDisclosureIndicator: true,
          })),
        }],
        onItemSelect: async ({ index }) => {
          const playlist = playlistsCache[index];
          if (!playlist) return;
          await pushCollectionTemplate(playlist.id, 'playlist');
        },
      });

      const tabBarTemplate = new TabBarTemplate({
        id: 'cp-tabs',
        templates: [albumsTemplate, playlistsTemplate],
        onTemplateSelect: () => {},
      });

      CarPlay.setRootTemplate(tabBarTemplate, false);

      // Shows the system Now Playing button in the CarPlay nav bar.
      // Must be called AFTER NowPlayingTemplate is instantiated above.
      CarPlay.enableNowPlaying(true);
    }

    CarPlay.registerOnConnect(onConnect);
    if (CarPlay.connected) onConnect();

    return () => {
      CarPlay.unregisterOnConnect(onConnect);
    };
  }, []);

  return null;
}
