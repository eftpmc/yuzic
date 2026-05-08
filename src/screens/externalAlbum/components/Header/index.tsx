import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { ExternalAlbum, Playlist, Song } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { CloudDownload } from 'lucide-react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import DownloadAlbumSheet from '@/components/options/DownloadAlbumSheet';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  album: ExternalAlbum;
};

function isCountLikeAlbumText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '');
}

const ExternalAlbumHeader: React.FC<Props> = ({ album }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const { playSongInCollection } = usePlaying();
  const albumStatus = useExternalAlbumStatus(album);
  const previewsRaw = useExternalAlbumPreviews(album);
  const previews = useMemo(
    () => previewsRaw instanceof Map ? previewsRaw : new Map<string, string>(),
    [previewsRaw]
  );

  const downloadSheetRef = useSheetRef();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);

  const previewSongs = useMemo<Song[]>(() => (
    songs
      .filter(s => previews.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        artistId: '',
        cover: s.cover,
        duration: s.duration,
        albumId: s.albumId,
        streamUrl: previews.get(s.id)!,
      }))
  ), [songs, previews]);

  const previewCollection = useMemo<Playlist>(() => ({
    id: `preview-${album.id}`,
    title: album.title,
    subtext: album.artist,
    cover: album.cover,
    changed: new Date(),
    created: new Date(),
    songs: previewSongs,
  }), [album, previewSongs]);

  const handlePlay = () => {
    if (!previewSongs.length) return;
    playSongInCollection(previewSongs[0], previewCollection);
  };

  const handleShuffle = () => {
    if (!previewSongs.length) return;
    playSongInCollection(previewSongs[0], previewCollection, true);
  };

  const canDownload = isLidarrConnected || isSlskdConnected;

  const handleDownload = () => {
    if (!canDownload || albumStatus.kind !== 'none') return;
    downloadSheetRef.current?.present();
  };

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist && !isCountLikeAlbumText(album.artist)) items.push(album.artist);
    if (songs.length > 0) items.push(t('externalAlbum.header.songs', { count: songs.length }));
    return [...new Set(items.map(item => item.trim()).filter(Boolean))];
  }, [album.artist, songs.length, t]);

  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <>
      <View style={styles.container}>
        {/* Header nav */}
        <View style={[styles.headerRow, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.headerTitleWrapper}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]} numberOfLines={1}>
              {album.title}
            </Text>
          </View>

          {/* Spacer to balance the back button */}
          <View style={styles.headerButton} />
        </View>

        {/* Cover */}
        <View style={styles.coverWrapper}>
          <MediaImage cover={album.cover} size="detail" style={styles.coverImage} />
        </View>

        {/* Title + metadata */}
        <View style={styles.titleInfo}>
          <Text style={[styles.title, themeStyles.title]} numberOfLines={2}>
            {album.title}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, themeStyles.subtext]}>•</Text>
                )}
                {index === 0 && album.artist ? (
                  <TouchableOpacity
                    onPress={() =>
                      (navigation as any).navigate('externalArtistView', {
                        source: album.externalSource,
                        artistId: album.externalIds?.artistDeezerId,
                        mbid: album.artistMbid,
                        name: album.artist,
                      })
                    }
                  >
                    <Text style={[styles.subtext, themeStyles.subtext]} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.subtext, themeStyles.subtext]} numberOfLines={1}>
                    {item}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Server status row */}
        {albumStatus.kind !== 'none' && (
          <View style={[styles.serverStatusRow, themeStyles.serverStatusRow]}>
            {albumStatus.kind === 'in_library' ? (
              <>
                <Ionicons name="link" size={14} color="#34C759" />
                <Text style={[styles.serverStatusText, { color: '#34C759' }]}>
                  {t('externalAlbum.serverStatus.onServer')}
                </Text>
              </>
            ) : (
              <>
                <SpinningLoaderCircle size={14} color="#007AFF" />
                <Text style={[styles.serverStatusText, { color: '#007AFF' }]}>
                  {t('externalAlbum.serverStatus.downloadingToServer', { progress: albumStatus.progress })}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, themeStyles.secondaryButton]}
              onPress={handleShuffle}
              disabled={!previewSongs.length}
            >
              <Ionicons name="shuffle" size={18} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: themeColor }]}
              onPress={handlePlay}
              disabled={!previewSongs.length}
            >
              <Ionicons name="play" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, themeStyles.secondaryButton]}
              onPress={handleDownload}
              disabled={!canDownload || albumStatus.kind !== 'none'}
            >
              <CloudDownload
                size={18}
                color={
                  !canDownload || albumStatus.kind !== 'none'
                    ? (isDarkMode ? '#555' : '#bbb')
                    : (isDarkMode ? '#fff' : '#000')
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DownloadAlbumSheet album={album} sheetRef={downloadSheetRef} />
    </>
  );
};

export default ExternalAlbumHeader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    maxWidth: '60%',
  },
  headerTitleDark: {
    color: '#fff',
  },
  headerButton: {
    padding: 6,
    width: 36,
  },
  coverWrapper: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginTop: 32,
    marginBottom: 24,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  titleInfo: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
  },
  metaDot: {
    fontSize: 14,
    marginHorizontal: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  serverStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const stylesLight = StyleSheet.create({
  title: { color: '#000' },
  subtext: { color: '#666' },
  secondaryButton: { backgroundColor: '#f0f0f0' },
  serverStatusRow: { backgroundColor: 'rgba(0,0,0,0.05)' },
});

const stylesDark = StyleSheet.create({
  title: { color: '#fff' },
  subtext: { color: '#aaa' },
  secondaryButton: { backgroundColor: '#1c1c1e' },
  serverStatusRow: { backgroundColor: 'rgba(255,255,255,0.07)' },
});
