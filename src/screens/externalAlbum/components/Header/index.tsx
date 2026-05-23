import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTranslation } from 'react-i18next';
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
import { CloudDownload, ChevronLeft, Link, Play } from 'lucide-react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { externalSongToTrack } from '@/hooks/usePreviewPlayer';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
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
  const { isDarkMode, colors } = useTheme();
  const { navigateToArtist } = useMatchedNavigation();
  const themeColor = useSelector(selectThemeColor);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const { playSongInCollection } = usePlaying();
  const albumStatus = useExternalAlbumStatus(album);
  const previews = useExternalAlbumPreviews(album);
  const downloadSheetRef = useSheetRef();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);

  const previewSongs = useMemo<Song[]>(
    () => songs.filter(s => !!previews[s.id]).map(s => externalSongToTrack(s, previews[s.id])),
    [songs, previews]
  );

  const previewCollection = useMemo<Playlist>(() => ({
    id: `preview-${album.id}`,
    title: album.title,
    subtext: album.artist,
    cover: album.cover,
    changed: new Date(),
    created: new Date(),
    songs: previewSongs,
  }), [album, previewSongs]);

  const canDownload = isLidarrConnected || isSlskdConnected;

  const handlePlay = useCallback(() => {
    if (!previewSongs.length) return;
    playSongInCollection(previewSongs[0], previewCollection);
  }, [previewSongs, previewCollection, playSongInCollection]);

  const handleDownload = useCallback(() => {
    if (!canDownload || albumStatus.kind !== 'none') return;
    downloadSheetRef.current?.present();
  }, [canDownload, albumStatus.kind, downloadSheetRef]);

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist && !isCountLikeAlbumText(album.artist)) items.push(album.artist);
    if (songs.length > 0) items.push(t('externalAlbum.header.songs', { count: songs.length }));
    return [...new Set(items.map(item => item.trim()).filter(Boolean))];
  }, [album.artist, songs.length, t]);

  const serverStatusBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ChevronLeft size={24} color={colors.secondary} />
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.headerTitleWrapper}>
            <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
              {album.title}
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.coverWrapper}>
          <MediaImage cover={album.cover} size="detail" style={styles.coverImage} />
        </View>

        <View style={styles.titleInfo}>
          <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
            {album.title}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                )}
                {index === 0 && album.artist ? (
                  <TouchableOpacity
                    onPress={() =>
                      navigateToArtist({
                        id: album.externalIds?.artistDeezerId ?? '',
                        name: album.artist,
                        cover: { kind: 'none' },
                        subtext: '',
                        externalSource: album.externalSource,
                        externalIds: { deezerId: album.externalIds?.artistDeezerId, mbid: album.artistMbid },
                      })
                    }
                  >
                    <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                    {item}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {albumStatus.kind !== 'none' && (
          <View style={[styles.serverStatusRow, { backgroundColor: serverStatusBg }]}>
            {albumStatus.kind === 'in_library' ? (
              <>
                <Link size={14} color="#34C759" />
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

        <View style={styles.actionsRow}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: themeColor }]}
              onPress={handleDownload}
              disabled={!canDownload || albumStatus.kind !== 'none'}
            >
              <CloudDownload
                size={20}
                color={!canDownload || albumStatus.kind !== 'none' ? 'rgba(255,255,255,0.4)' : '#fff'}
              />
            </TouchableOpacity>

            {previewSongs.length > 0 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card }]}
                onPress={handlePlay}
              >
                <Play size={18} color={colors.secondary} fill={colors.secondary} />
              </TouchableOpacity>
            )}
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
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '60%',
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
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
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
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
});

