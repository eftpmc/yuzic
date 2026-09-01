import React, { useCallback, useMemo } from 'react';
import { Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native';

import { Playlist } from '@/types';
import PlaylistOptions from '@/components/options/PlaylistOptions';

import { usePlayingActions } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatDuration } from '@/utils/formatDuration';
import DownloadProgressRing from '@/components/DownloadProgressRing';
import { useCollectionDownloadProgress } from '@/hooks/useCollectionDownloadProgress';
import {
  DetailActionRow,
  DetailCircleAction,
  DetailHeader,
  DetailHeaderBar,
  DetailHeaderIconButton,
  DetailMetaDot,
  DetailMetaRow,
  DetailMetaText,
  DetailPlayAction,
} from '@/components/DetailHeader';
import { spacing } from '@/constants/design';

type Props = {
  playlist: Playlist;
  showNavigation?: boolean;
  onOptions?: () => void;
};

const PlaylistHeader: React.FC<Props> = ({ playlist, showNavigation = true, onOptions }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const { playSongInCollection } = usePlayingActions();
  const { downloadPlaylistById, cancelCollectionDownloads, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => playlist.songs ?? [], [playlist.songs]);
  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded: isPlaylistDownloaded, isDownloading: isPlaylistDownloading } =
    getCollectionDownloadState(songIds);
  const downloadFraction = useCollectionDownloadProgress(songIds);

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
    if (isPlaylistDownloading) {
      await cancelCollectionDownloads(playlist.id);
      return;
    }
    if (!songs.length || isPlaylistDownloaded) return;
    await downloadPlaylistById(playlist.id, songs);
  }, [songs, isPlaylistDownloading, isPlaylistDownloaded, downloadPlaylistById, cancelCollectionDownloads, playlist.id]);

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
    <>
      <DetailHeader
        title={playlist.title}
        cover={playlist.cover}
        rightAction={
          <DetailHeaderIconButton onPress={onOptions ?? (() => optionsSheetRef.current?.present())}>
            <Ellipsis size={24} color={colors.secondary} />
          </DetailHeaderIconButton>
        }
        meta={
          <DetailMetaRow>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && <DetailMetaDot />}
                <DetailMetaText>{item}</DetailMetaText>
              </React.Fragment>
            ))}
          </DetailMetaRow>
        }
        actions={
          <DetailActionRow style={{ marginBottom: spacing.lg }}>
            <DetailCircleAction onPress={handleShuffle} accessibilityLabel="Shuffle playlist">
              <Shuffle size={18} color={colors.secondary} />
            </DetailCircleAction>

            <DetailPlayAction onPress={handlePlay} accessibilityLabel="Play playlist">
              <Play size={24} color="#fff" fill="#fff" />
            </DetailPlayAction>

            <DetailCircleAction
              onPress={() => void toggleDownload()}
              accessibilityLabel={
                isPlaylistDownloading ? 'Cancel download' : isPlaylistDownloaded ? 'Downloaded' : 'Download playlist'
              }
            >
              {isPlaylistDownloading ? (
                <DownloadProgressRing progress={downloadFraction} size={18} />
              ) : isPlaylistDownloaded ? (
                <Check size={18} color={colors.secondary} />
              ) : (
                <Download size={18} color={colors.secondary} />
              )}
            </DetailCircleAction>
          </DetailActionRow>
        }
        showNavigation={showNavigation}
      />
      {!onOptions && <PlaylistOptions ref={optionsSheetRef} playlist={playlist} hideGoToPlaylist />}
    </>
  );
};

export const PlaylistHeaderBar: React.FC<Props> = ({ playlist, onOptions }) => {
  const { colors } = useTheme();
  return (
    <DetailHeaderBar
      title={playlist.title}
      rightAction={
        <DetailHeaderIconButton onPress={onOptions}>
          <Ellipsis size={24} color={colors.secondary} />
        </DetailHeaderIconButton>
      }
    />
  );
};

export default PlaylistHeader;
