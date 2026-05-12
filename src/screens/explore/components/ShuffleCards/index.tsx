import React, { useMemo, useRef } from 'react'
import {
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Shuffle, Heart, Download } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useDownload } from '@/contexts/DownloadContext'

import { useTheme } from '@/hooks/useTheme'
import { usePlaying } from '@/contexts/PlayingContext'
import { useTracks } from '@/hooks/tracks'
import { useStarredSongs } from '@/hooks/starred'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'
import shuffleArray from '@/utils/shuffleArray'
import { Song, SongBase } from '@/types'
import { isPlayableSong, usePlayableSongResolver } from '@/hooks/songs'

const H_PADDING = 12
const SHUFFLE_DETAIL_LIMIT = 100

function buildFakeCollection(songs: Song[]) {
  return {
    id: '_shuffle',
    title: '',
    cover: { kind: 'none' as const },
    subtext: '',
    changed: new Date(),
    created: new Date(),
    songs,
  }
}

export default function ShuffleCards() {
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const { playSongInCollection } = usePlaying()
  const { resolvePlayableSong } = usePlayableSongResolver()

  const { tracks } = useTracks()
  const { songs: starredSongs } = useStarredSongs()
  const { getAllDownloadedTracks } = useDownload()

  const inFlightRef = useRef<string | null>(null)

  const downloadedTrackIds = useMemo(
    () => new Set(getAllDownloadedTracks().map(track => track.trackId)),
    [getAllDownloadedTracks]
  )
  const downloadedSongs = useMemo(
    () => tracks.filter(track => downloadedTrackIds.has(track.id)),
    [downloadedTrackIds, tracks]
  )

  const fetchPlayableSongs = async (baseSongs: SongBase[]): Promise<Song[]> => {
    const shuffled = shuffleArray(baseSongs).slice(0, SHUFFLE_DETAIL_LIMIT)
    const settled = await Promise.allSettled(shuffled.map(song => resolvePlayableSong(song)))

    return settled
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter(isPlayableSong)
  }

  const handleShuffle = async (key: string, songs: SongBase[] | Song[]) => {
    if (inFlightRef.current === key) return
    if (songs.length === 0) return
    inFlightRef.current = key
    try {
      const playableSongs = songs.every(isPlayableSong)
        ? songs as Song[]
        : await fetchPlayableSongs(songs)
      const shuffled = shuffleArray(playableSongs)
      if (!shuffled.length) return
      await playSongInCollection(shuffled[0], buildFakeCollection(shuffled), false)
    } finally {
      inFlightRef.current = null
    }
  }

  const cards = [
    {
      key: 'all',
      label: t('library.shuffle.all'),
      icon: (color: string) => <Shuffle size={16} color={color} />,
      songs: tracks,
    },
    {
      key: 'favorites',
      label: t('library.shuffle.favorites'),
      icon: (color: string) => <Heart size={16} color={color} />,
      songs: starredSongs,
    },
    {
      key: 'downloaded',
      label: t('library.shuffle.downloaded'),
      icon: (color: string) => <Download size={16} color={color} />,
      songs: downloadedSongs,
    },
  ]

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: H_PADDING }]}
      style={styles.scroll}
    >
      {cards.map(card => {
        const empty = card.songs.length === 0
        return (
          <TouchableOpacity
            key={card.key}
            style={[
              styles.card,
              isDarkMode && styles.cardDark,
              { opacity: empty ? 0.4 : 1 },
            ]}
            onPress={() => void handleShuffle(card.key, card.songs)}
            activeOpacity={0.7}
            disabled={empty}
          >
            {card.icon(themeColor)}
            <Text style={[styles.label, isDarkMode && styles.labelDark]} numberOfLines={1}>
              {card.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardDark: {
    backgroundColor: '#1C1C1E',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
})
