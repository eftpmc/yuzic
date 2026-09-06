import React, { useCallback, useMemo } from 'react';
import { Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native';

import { Playlist } from '@/types';
import PlaylistOptions from '@/components/options/PlaylistOptions';

import { usePlayingActions } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
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
import { iconSize, spacing } from '@/constants/design';

type Props = {
  playlist: Playlist;
  showNavigation?: boolean;
  onOptions?: () => void;
};

const PlaylistHeader: React.FC<Props> = ({ playlist, showNavigation = true, onOptions }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

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

  // No play is counted here. Pressing play is not listening: these used to
  // credit songs[0] — and its album and artist — the instant the button was
  // hit, so the first track of every playlist was counted twice once the real
  // listen scrobbled, and shuffling credited a track that usually never
  // played at all. The player attributes the playlist itself when a listen
  // actually passes the threshold, which is also what finally made playlists
  // started from anywhere else count.
  const handleShuffle = useCallback(() => {
    if (!songs.length) return;
    playSongInCollection(songs[0], playlist, true);
  }, [songs, playlist, playSongInCollection]);

  const handlePlay = useCallback(() => {
    if (!songs.length) return;
    playSongInCollection(songs[0], playlist);
  }, [songs, playlist, playSongInCollection]);

  return (
    <>
      <DetailHeader
        title={playlist.title}
        cover={playlist.cover}
        rightAction={
          <DetailHeaderIconButton
            accessibilityLabel={t('a11y.common.moreOptions')}
            onPress={onOptions ?? (() => optionsSheetRef.current?.present())}
          >
            <Ellipsis size={iconSize.header} color={colors.secondary} />
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
            <DetailCircleAction onPress={handleShuffle} accessibilityLabel={t('a11y.detail.shuffle')}>
              <Shuffle size={iconSize.row} color={colors.secondary} />
            </DetailCircleAction>

            <DetailPlayAction onPress={handlePlay} accessibilityLabel={t('a11y.detail.play')}>
              <Play size={iconSize.header} color="#fff" fill="#fff" />
            </DetailPlayAction>

            <DetailCircleAction
              onPress={() => void toggleDownload()}
              accessibilityLabel={t(
                isPlaylistDownloading
                  ? 'a11y.detail.cancelDownload'
                  : isPlaylistDownloaded
                    ? 'a11y.detail.downloaded'
                    : 'a11y.detail.download'
              )}
            >
              {isPlaylistDownloading ? (
                <DownloadProgressRing progress={downloadFraction} size={iconSize.row} />
              ) : isPlaylistDownloaded ? (
                <Check size={iconSize.row} color={colors.secondary} />
              ) : (
                <Download size={iconSize.row} color={colors.secondary} />
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <DetailHeaderBar
      title={playlist.title}
      rightAction={
        <DetailHeaderIconButton
          accessibilityLabel={t('a11y.common.moreOptions')}
          onPress={onOptions}
        >
          <Ellipsis size={iconSize.header} color={colors.secondary} />
        </DetailHeaderIconButton>
      }
    />
  );
};

export default PlaylistHeader;
