import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Playlist } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import PlaylistOptions from '@/components/options/PlaylistOptions';

import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector, useDispatch } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatDuration } from '@/utils/formatDuration';

type Props = {
  playlist: Playlist;
};

const PlaylistHeader: React.FC<Props> = ({ playlist }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const optionsSheetRef = useSheetRef();

  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const { playSongInCollection } = usePlaying();
  const { downloadPlaylistById, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => playlist.songs ?? [], [playlist.songs]);
  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded: isPlaylistDownloaded, isDownloading: isPlaylistDownloading } =
    getCollectionDownloadState(songIds);

  const totalDuration = useMemo(
    () => songs.reduce((sum, song) => sum + Number(song.duration), 0),
    [songs]
  );

  const metadataItems = useMemo(
    () => [
      `${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')}`,
      formatDuration(totalDuration),
    ],
    [songs.length, totalDuration, t]
  );

  const toggleDownload = useCallback(async () => {
    if (!songs.length || isPlaylistDownloading || isPlaylistDownloaded) return;
    await downloadPlaylistById(playlist.id, songs);
  }, [songs, isPlaylistDownloading, isPlaylistDownloaded, downloadPlaylistById, playlist.id]);

  const handleShuffle = useCallback(() => {
    if (!songs.length) return;
    playSongInCollection(songs[0], playlist, true);
    if (activeServer) {
      dispatch(incrementPlay({ serverId: activeServer.id, songId: songs[0].id, albumId: songs[0].albumId, artistId: songs[0].artistId, playlistId: playlist.id }));
    }
  }, [songs, playlist, playSongInCollection, activeServer, dispatch]);

  const handlePlay = useCallback(() => {
    if (!songs.length) return;
    playSongInCollection(songs[0], playlist);
    if (activeServer) {
      dispatch(incrementPlay({ serverId: activeServer.id, songId: songs[0].id, albumId: songs[0].albumId, artistId: songs[0].artistId, playlistId: playlist.id }));
    }
  }, [songs, playlist, playSongInCollection, activeServer, dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
            {playlist.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => optionsSheetRef.current?.present()}
          style={styles.headerButton}
        >
          <Ellipsis size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <PlaylistOptions ref={optionsSheetRef} playlist={playlist} hideGoToPlaylist />

      <View style={styles.coverWrapper}>
        <MediaImage cover={playlist.cover} size="detail" style={styles.coverImage} />
      </View>

      <View style={styles.titleInfo}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
          {playlist.title}
        </Text>

        <View style={styles.metaRow}>
          {metadataItems.map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              {index > 0 && (
                <Text style={[styles.metaDot, { color: colors.subtext }]} numberOfLines={1}>
                  •
                </Text>
              )}
              <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                {item}
              </Text>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card }]}
            onPress={handleShuffle}
          >
            <Shuffle size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColor }]}
            onPress={handlePlay}
          >
            <Play size={24} color="#fff" fill="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card }]}
            onPress={() => void toggleDownload()}
            disabled={isPlaylistDownloading}
          >
            {isPlaylistDownloading ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : isPlaylistDownloaded ? (
              <Check size={18} color={colors.secondary} />
            ) : (
              <Download size={18} color={colors.secondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PlaylistHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
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
    alignSelf: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
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
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
