import React, { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { ChevronLeft, Shuffle, Play, Check, Download, CheckCircle, ArrowDownCircle } from 'lucide-react-native'
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
import { usePlaying } from '@/contexts/PlayingContext'
import { useDownload } from '@/contexts/DownloadContext'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'

type Props = {
  genre: string
  albums: AlbumBase[]
}

const GenreHeader: React.FC<Props> = ({ genre, albums }) => {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const api = useApi()
  const { isDarkMode, colors } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const activeServer = useSelector(selectActiveServer)
  const { playSongInCollection } = usePlaying()
  const { downloadAlbumById, getCollectionDownloadState } = useDownload()
  const { t } = useTranslation()

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
      for (const album of albums) {
        await downloadAlbumById(album.id)
      }
    } finally {
      setIsDownloadingAll(false)
    }
  }

  return (
    <>
      <View style={styles.fullBleedWrapper}>
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

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.genreName, { color: colors.secondary }]}>
          {genre}
        </Text>
        <Text style={[styles.subtext, { color: colors.subtext }]}>
          {albums.length} {albums.length === 1 ? 'album' : 'albums'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => { void play(true) }}
          disabled={songsLoading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {songsLoading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Shuffle size={18} color={colors.secondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { void play(false) }}
          disabled={songsLoading}
          style={[styles.playButton, { backgroundColor: themeColor }]}
        >
          {songsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Play size={24} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { void handleDownloadAll() }}
          disabled={isDownloadingAll || isDownloading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {isDownloadingAll || isDownloading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : isFullyDownloaded ? (
            <Check size={18} color={colors.secondary} />
          ) : (
            <Download size={18} color={colors.secondary} />
          )}
        </TouchableOpacity>
      </View>
    </>
  )
}

export default GenreHeader

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 220,
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
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  genreName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
