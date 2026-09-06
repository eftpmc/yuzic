import React, { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native'
import TurboImage from 'react-native-turbo-image'
import { useSelector } from 'react-redux'
import { toast } from '@backpackapp-io/react-native-toast'
import { useTranslation } from 'react-i18next'

import { AlbumBase, Song } from '@/types'
import { useApi } from '@/api'
import { fetchAlbumDetailsSettled } from '@/hooks/albums'
import { buildCover } from '@/utils/builders/buildCover'
import { useTheme } from '@/hooks/useTheme'
import { useTracks } from '@/hooks/tracks'
import { usePlayingActions } from '@/contexts/PlayingContext'
import { useDownload } from '@/contexts/DownloadContext'
import { useSheetRef } from '@/utils/useSheetRef'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import {
  DetailActionRow,
  DetailCircleAction,
  DetailPlayAction,
  DetailHeaderBar,
  DetailHeaderIconButton,
  useDetailHeaderInset,
  useDetailHeroTitleLayout,
} from '@/components/DetailHeader'
import GenreOptions from '@/components/options/GenreOptions'
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { controlSize, iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  genre: string
  albums: AlbumBase[]
  showNavigation?: boolean
}

const GenreHeader: React.FC<Props> = ({ genre, albums, showNavigation = true }) => {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const api = useApi()
  const { isDarkMode, colors } = useTheme()
  const rad = useRadius()
  const activeServer = useSelector(selectActiveServer)
  const { playSongInCollection } = usePlayingActions()
  const { downloadAlbumById, getCollectionDownloadState } = useDownload()
  const { t } = useTranslation()

  // The bar floats over this art now, so the wrapper grows by exactly the room
  // it and the status bar take: the content below stays put and the extra strip
  // at the top is filled with art rather than a band.
  const barInset = useDetailHeaderInset()
  const onTitleLayout = useDetailHeroTitleLayout()

  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [songsLoading, setSongsLoading] = useState(false)
  const { tracks } = useTracks()

  const coverUri = albums[0]?.cover ? buildCover(albums[0].cover, 'background') : null

  const albumIds = useMemo(
    () => new Set(albums.map(album => album.id)),
    [albums]
  )
  const genreTrackIds = useMemo(
    () => tracks
      .filter(track => albumIds.has(track.albumId))
      .map(track => track.id),
    [albumIds, tracks]
  )

  const {
    isDownloaded: isFullyDownloaded,
    isDownloading,
  } = getCollectionDownloadState(genreTrackIds)

  const fetchGenreSongs = async (): Promise<Song[]> => {
    if (!activeServer?.id || !albums.length) return []

    const fullAlbums = await fetchAlbumDetailsSettled({
      queryClient,
      serverId: activeServer.id,
      albums,
      getAlbum: api.albums.get,
    })

    return fullAlbums.flatMap(album => album.songs ?? [])
  }

  const play = async (shuffle = false) => {
    if (songsLoading) return

    const playableSongs = await (async () => {
      setSongsLoading(true)
      try {
        return await fetchGenreSongs()
      } catch {
        return []
      } finally {
        setSongsLoading(false)
      }
    })()

    if (!playableSongs.length) {
      toast.error(t('common.oneSecond'))
      return
    }
    playSongInCollection(
      playableSongs[0],
      {
        id: genre,
        title: genre,
        artist: {
          id: genre,
          name: genre,
          cover: albums[0]?.cover ?? { kind: 'none' },
          subtext: '',
        },
        cover: albums[0]?.cover ?? { kind: 'none' },
        songs: playableSongs,
        subtext: t('common.playlist'),
        changed: new Date('1995-12-17T03:24:00'),
        created: new Date('1995-12-17T03:24:00'),
      },
      shuffle,
    )
  }

  const handleDownloadAll = async () => {
    if (isDownloadingAll || isDownloading || isFullyDownloaded || !albums.length) return
    setIsDownloadingAll(true)
    try {
      await Promise.all(albums.map(album => downloadAlbumById(album.id)))
    } finally {
      setIsDownloadingAll(false)
    }
  }

  return (
    <>
      <View style={[styles.fullBleedWrapper, { height: GENRE_HERO_HEIGHT + barInset }]}>
        {coverUri && (
          <TurboImage
            source={{ uri: coverUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blur={Platform.OS === 'ios' ? 20 : 10}
            fadeDuration={300}
            cachePolicy="dataCache"
          />
        )}

        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']
              : [
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.7)',
                  'rgba(255,255,255,1)',
                ]
          }
          style={StyleSheet.absoluteFill}
        />

        {showNavigation && (
          <View style={styles.header}>
            <Touchable
              testID="detail-back-button"
              accessibilityRole="button"
              accessibilityLabel={t('a11y.common.back')}
              style={[styles.backButton, { borderRadius: rad.pillFor(controlSize.iconCompact) }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={iconSize.header} color="#fff" style={{ marginLeft: -2 }} />
            </Touchable>
          </View>
        )}
      </View>

      <View style={styles.content} onLayout={onTitleLayout}>
        <Text style={[styles.genreName, { color: colors.secondary }]}>
          {genre}
        </Text>
        <Text style={[styles.subtext, { color: colors.subtext }]}>
          {albums.length} {albums.length === 1 ? 'album' : 'albums'}
        </Text>
      </View>

      <DetailActionRow style={styles.buttonRow}>
        <DetailCircleAction
          onPress={() => { void play(true) }}
          disabled={songsLoading}
          style={isDarkMode ? styles.secondaryButtonDark : styles.secondaryButton}
          accessibilityLabel={t('a11y.detail.shuffle')}
        >
          {songsLoading ? (
            <SpinningLoaderCircle size={iconSize.row} color={colors.secondary} />
          ) : (
            <Shuffle size={iconSize.row} color={colors.secondary} />
          )}
        </DetailCircleAction>

        <DetailPlayAction
          onPress={() => { void play(false) }}
          disabled={songsLoading}
          accessibilityLabel={t('a11y.detail.play')}
        >
          {songsLoading ? (
            <SpinningLoaderCircle size={iconSize.row} color={colors.onThemeColor} />
          ) : (
            <Play size={iconSize.header} color={colors.onThemeColor} fill={colors.onThemeColor} />
          )}
        </DetailPlayAction>

        <DetailCircleAction
          onPress={() => { void handleDownloadAll() }}
          disabled={isDownloadingAll || isDownloading}
          style={isDarkMode ? styles.secondaryButtonDark : styles.secondaryButton}
          accessibilityLabel={t(
            isDownloadingAll || isDownloading
              ? 'a11y.detail.downloading'
              : isFullyDownloaded
                ? 'a11y.detail.downloaded'
                : 'a11y.detail.download'
          )}
        >
          {isDownloadingAll || isDownloading ? (
            <SpinningLoaderCircle size={iconSize.row} color={colors.secondary} />
          ) : isFullyDownloaded ? (
            <Check size={iconSize.row} color={colors.secondary} />
          ) : (
            <Download size={iconSize.row} color={colors.secondary} />
          )}
        </DetailCircleAction>
      </DetailActionRow>
    </>
  )
}

export const GenreHeaderBar: React.FC<Props> = ({ genre, albums }) => (
  <DetailHeaderBar title={genre} rightAction={<GenreOptionsButton genre={genre} albums={albums} />} />
)

function GenreOptionsButton({ genre, albums }: { genre: string; albums: AlbumBase[] }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const optionsSheetRef = useSheetRef()
  return (
    <>
      <DetailHeaderIconButton
        accessibilityLabel={t('a11y.common.moreOptions')}
        onPress={() => optionsSheetRef.current?.present()}
      >
        <Ellipsis size={iconSize.header} color={colors.secondary} />
      </DetailHeaderIconButton>
      <GenreOptions ref={optionsSheetRef} genre={genre} albums={albums} />
    </>
  )
}

export default GenreHeader

/** The blurred cover behind a genre's name, before the floating bar's inset. */
const GENRE_HERO_HEIGHT = 220;

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: GENRE_HERO_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 20,
  },
  backButton: {
    padding: spacing.tight,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  genreName: {
    ...typography.display,
    textAlign: 'center',
  },
  subtext: {
    ...typography.rowSubtitle,
    marginTop: spacing.tight,
  },
  buttonRow: {
    marginBottom: spacing.xl,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
})
