import React, { forwardRef, useMemo, useState } from 'react';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ListEnd, ListStart, Shuffle, Check, ArrowDownCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { AlbumBase, Song } from '@/types';
import { useApi } from '@/api';
import { fetchAlbumDetailsSettled } from '@/hooks/albums';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useTracks } from '@/hooks/tracks';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { iconSize } from '@/constants/design';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetRow,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';

export type GenreOptionsProps = {
  genre: string;
  albums: AlbumBase[];
};

const GenreOptions = forwardRef<BottomSheetModal, GenreOptionsProps>(({ genre, albums }, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();
  const queryClient = useQueryClient();
  const activeServer = useSelector(selectActiveServer);

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
    currentSong,
    playNext,
  } = usePlaying();

  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const { tracks } = useTracks();

  const snapPoints = useMemo(() => ['40%', '70%'], []);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const sheetBg = useOptionSheetBackground();

  const albumIds = useMemo(() => new Set(albums.map(a => a.id)), [albums]);
  const genreTrackIds = useMemo(
    () => tracks.filter(track => albumIds.has(track.albumId)).map(track => track.id),
    [albumIds, tracks]
  );
  const { isDownloaded: isFullyDownloaded, isDownloading } = getCollectionDownloadState(genreTrackIds);

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const fetchGenreSongs = async (): Promise<Song[]> => {
    if (!activeServer?.id || !albums.length) return [];
    const fullAlbums = await fetchAlbumDetailsSettled({
      queryClient,
      serverId: activeServer.id,
      albums,
      getAlbum: api.albums.get,
    });
    return fullAlbums.flatMap(album => album.songs ?? []);
  };

  const ensureSongsLoaded = async (): Promise<Song[]> => {
    if (songs.length) return songs;
    setSongsLoading(true);
    try {
      const loaded = await fetchGenreSongs();
      setSongs(loaded);
      return loaded;
    } finally {
      setSongsLoading(false);
    }
  };

  const genreCollection = (loadedSongs: Song[]) => ({
    id: genre,
    title: genre,
    artist: {
      id: genre,
      name: genre,
      cover: albums[0]?.cover ?? { kind: 'none' as const },
      subtext: '',
    },
    cover: albums[0]?.cover ?? { kind: 'none' as const },
    songs: loadedSongs,
    subtext: t('common.playlist'),
    changed: new Date('1995-12-17T03:24:00'),
    created: new Date('1995-12-17T03:24:00'),
  });

  const handleAddToNext = async () => {
    const loaded = await ensureSongsLoaded();
    if (!loaded.length) return;
    if (!currentSong) {
      toast.error(t('songOptions.toasts.nothingPlaying'));
      return;
    }
    [...loaded].reverse().forEach(song => playNext(song));
    toast.success(t('genreOptions.toasts.addedNext', { genre }));
    close();
  };

  const handleAddToEnd = async () => {
    const loaded = await ensureSongsLoaded();
    if (!loaded.length) return;
    const collection = genreCollection(loaded);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(loaded[0], collection, false);
    } else {
      addCollectionToQueue(collection);
      toast.success(t('genreOptions.toasts.addedToEnd', { genre }));
    }
    close();
  };

  const handleShuffleToQueue = async () => {
    const loaded = await ensureSongsLoaded();
    if (!loaded.length) return;
    const collection = genreCollection(loaded);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(loaded[0], collection, true);
    } else {
      shuffleCollectionToQueue(collection);
      toast.success(t('genreOptions.toasts.shuffledToQueue', { genre }));
    }
    close();
  };

  const handleDownloadAll = async () => {
    if (isDownloadingAll || isDownloading || isFullyDownloaded || !albums.length) return;
    setIsDownloadingAll(true);
    try {
      await Promise.all(albums.map(album => downloadAlbumById(album.id)));
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
      stackBehavior="push"
      onChange={(index) => setIsSheetOpen(index >= 0)}
    >
      <BottomSheetScrollView
        style={sheetBg}
        contentContainerStyle={optionSheetStyles.sheetContent}
      >
        <OptionSheetHeader
          cover={albums[0]?.cover ?? { kind: 'none' }}
          title={genre}
          subtitle={`${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`}
        />

        <OptionSheetDivider />

        <OptionSheetRow
          icon={<ListStart size={iconSize.loader} color={colors.secondary} />}
          label={t('genreOptions.actions.addToNext')}
          onPress={() => void handleAddToNext()}
          loading={songsLoading && isSheetOpen}
        />
        <OptionSheetRow
          icon={<ListEnd size={iconSize.loader} color={colors.secondary} />}
          label={t('genreOptions.actions.addToEnd')}
          onPress={() => void handleAddToEnd()}
          loading={songsLoading && isSheetOpen}
        />
        <OptionSheetRow
          icon={<Shuffle size={iconSize.loader} color={colors.secondary} />}
          label={t('genreOptions.actions.shuffleToQueue')}
          onPress={() => void handleShuffleToQueue()}
          loading={songsLoading && isSheetOpen}
        />
        <OptionSheetRow
          icon={
            isDownloadingAll || isDownloading ? undefined
              : isFullyDownloaded ? <Check size={iconSize.loader} color={colors.secondary} />
                : <ArrowDownCircle size={iconSize.loader} color={colors.secondary} />
          }
          label={
            isDownloadingAll || isDownloading ? t('genreOptions.actions.downloading')
              : isFullyDownloaded ? t('genreOptions.actions.downloaded')
                : t('genreOptions.actions.download')
          }
          onPress={() => void handleDownloadAll()}
          loading={isDownloadingAll || isDownloading}
          dimLabel={isFullyDownloaded}
          disabled={isDownloadingAll || isDownloading || isFullyDownloaded}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

GenreOptions.displayName = 'GenreOptions';

export default GenreOptions;
