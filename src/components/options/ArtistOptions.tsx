import React, { forwardRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { ListEnd } from 'lucide-react-native';

import { Artist, Song } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { QueryKeys } from '@/enums/queryKeys';
import { useTheme } from '@/hooks/useTheme';
import { useArtistMbid } from '@/hooks/artists';
import { staleTime } from '@/constants/staleTime';
import { useTranslation } from 'react-i18next';

export type ArtistOptionsProps = {
  artist: Artist | null;
  /** Hide "Go to Artist" when already on the artist screen */
  hideGoToArtist?: boolean;
};

const ArtistOptions = forwardRef<
  React.ElementRef<typeof BottomSheetModal>,
  ArtistOptionsProps
>(({ artist, hideGoToArtist }, ref) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const { data: mbid } = useArtistMbid(
    artist ? { id: artist.id, name: artist.name, mbid: artist.mbid } : null
  );

  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const loadSongs = useCallback(async () => {
    if (!artist?.ownedAlbums?.length) return [];
    const albums = await Promise.all(
      artist.ownedAlbums.map((a) =>
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Album, activeServer?.id, a.id],
          queryFn: () => api.albums.get(a.id),
          staleTime: staleTime.albums,
        })
      )
    );
    return albums.flatMap((a) => a?.songs ?? []);
  }, [artist, queryClient, api, activeServer?.id]);

  const buildCollection = useCallback(
    (songs: Song[]) => ({
      id: artist!.id,
      title: artist!.name,
      artist: {
        id: artist!.id,
        name: artist!.name,
        cover: artist!.cover,
        subtext: t('artistOptions.artistLabel'),
      },
      cover: artist!.cover,
      subtext: t('artistOptions.artistLabel'),
      songs,
      changed: new Date('1995-12-17T03:24:00'),
      created: new Date('1995-12-17T03:24:00'),
    }),
    [artist, t]
  );

  const handlePlay = async (shuffle: boolean) => {
    if (!artist) return;
    const songs = await loadSongs();
    if (!songs.length) return;
    const collection = buildCollection(songs);
    playSongInCollection(songs[0], collection, shuffle);
    close();
  };

  const handleAddToQueue = async () => {
    if (!artist) return;
    const songs = await loadSongs();
    if (!songs.length) return;
    const collection = buildCollection(songs);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], collection, false);
    } else {
      addCollectionToQueue(collection);
    }
    close();
  };

  const handleShuffleToQueue = async () => {
    if (!artist) return;
    const songs = await loadSongs();
    if (!songs.length) return;
    const collection = buildCollection(songs);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], collection, true);
    } else {
      shuffleCollectionToQueue(collection);
    }
    close();
  };

  const handleGoToArtist = () => {
    if (!artist) return;
    close();
    navigation.navigate('(home)', {
      screen: 'artistView',
      params: { id: artist.id },
    });
  };

  const handleGoToExternalArtist = () => {
    if (!artist || !mbid) return;
    close();
    navigation.navigate('externalArtistView', {
      mbid,
      name: artist.name,
    });
  };

  const handleViewExternal = () => {
    if (!mbid) return;
    close();
    Linking.openURL(`https://musicbrainz.org/artist/${mbid}`);
  };

  if (!artist) {
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      >
        <View style={[styles.loading, themeStyles.sheetBackground]}>
          <ActivityIndicator size="large" color={themeStyles.artist.color} />
        </View>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      handleIndicatorStyle={{
        backgroundColor: isDarkMode ? '#555' : '#ccc',
      }}
      backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      stackBehavior="push"
    >
      <BottomSheetScrollView
        style={themeStyles.sheetBackground}
        contentContainerStyle={styles.sheetContent}
      >
        <View style={styles.header}>
          <MediaImage cover={artist.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, themeStyles.title]}
              numberOfLines={2}
            >
              {artist.name}
            </Text>
            <Text style={[styles.artist, themeStyles.artist]}>{t('artistOptions.artistLabel')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.option} onPress={() => handlePlay(false)}>
          <Ionicons name="play" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.play')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handlePlay(true)}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleAddToQueue}>
          <ListEnd size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.addToQueue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleShuffleToQueue}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.shuffleToQueue')}</Text>
        </TouchableOpacity>

        {!hideGoToArtist && (
          <TouchableOpacity style={styles.option} onPress={handleGoToArtist}>
            <Ionicons name="person" size={26} color={themeStyles.icon.color} />
            <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.goToArtist')}</Text>
          </TouchableOpacity>
        )}

        {mbid && (
          <>
            <TouchableOpacity style={styles.option} onPress={handleGoToExternalArtist}>
              <Ionicons name="person-outline" size={26} color={themeStyles.icon.color} />
              <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.goToExternalArtist')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleViewExternal}>
              <Ionicons name="open-outline" size={26} color={themeStyles.icon.color} />
              <Text style={[styles.optionText, themeStyles.optionText]}>{t('artistOptions.actions.viewExternal')}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, themeStyles.artist]}>{t('artistOptions.sections.info')}</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>{t('artistOptions.info.albums')}</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>
            {artist.ownedAlbums?.length ?? 0}
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

ArtistOptions.displayName = 'ArtistOptions';

export default ArtistOptions;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  artist: { fontSize: 14, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionText: { marginLeft: 16, fontSize: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', marginLeft: 12, flex: 1, textAlign: 'right' },
});

const stylesLight = StyleSheet.create({
  sheetBackground: { backgroundColor: '#F2F2F7' },
  title: { color: '#000' },
  artist: { color: '#666' },
  optionText: { color: '#000' },
  icon: { color: '#000' },
});

const stylesDark = StyleSheet.create({
  sheetBackground: { backgroundColor: '#222' },
  title: { color: '#fff' },
  artist: { color: '#aaa' },
  optionText: { color: '#fff' },
  icon: { color: '#999' },
});
