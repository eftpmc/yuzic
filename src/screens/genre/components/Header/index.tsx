import React, { useMemo, useState } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useSelector } from 'react-redux'
import { toast } from '@backpackapp-io/react-native-toast'
import { useTranslation } from 'react-i18next'

import { Album } from '@/types'
import { buildCover } from '@/utils/builders/buildCover'
import { useTheme } from '@/hooks/useTheme'
import { usePlaying } from '@/contexts/PlayingContext'
import { useDownload } from '@/contexts/DownloadContext'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'

type Props = {
  genre: string
  albums: Album[]
}

const GenreHeader: React.FC<Props> = ({ genre, albums }) => {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const { playSongInCollection } = usePlaying()
  const { downloadAlbumById, getCollectionDownloadState } = useDownload()
  const { t } = useTranslation()

  const [isDownloadingAll, setIsDownloadingAll] = useState(false)

  const coverUri = albums[0]?.cover ? buildCover(albums[0].cover, 'background') : null

  const songs = useMemo(() => albums.flatMap((a) => a.songs ?? []), [albums])

  const {
    isDownloaded: isFullyDownloaded,
    isDownloading,
  } = getCollectionDownloadState(songs.map((s) => s.id))

  const play = (shuffle = false) => {
    if (!songs.length) {
      toast.error(t('common.oneSecond'))
      return
    }
    playSongInCollection(
      songs[0],
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
        songs,
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
        <Image
          source={coverUri ? { uri: coverUri } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={Platform.OS === 'ios' ? 20 : 10}
          transition={300}
        />

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
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.genreName, isDarkMode && styles.genreNameDark]}>
          {genre}
        </Text>
        <Text style={[styles.subtext, isDarkMode && styles.subtextDark]}>
          {albums.length} {albums.length === 1 ? 'album' : 'albums'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => play(true)}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          <Ionicons name="shuffle" size={18} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => play(false)}
          style={[styles.playButton, { backgroundColor: themeColor }]}
        >
          <Ionicons name="play" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { void handleDownloadAll() }}
          disabled={isDownloadingAll || isDownloading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {isDownloadingAll || isDownloading ? (
            <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
          ) : (
            <Ionicons
              name={isFullyDownloaded ? 'checkmark' : 'download-outline'}
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
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
    color: '#000',
    textAlign: 'center',
  },
  genreNameDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  subtextDark: {
    color: '#aaa',
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
