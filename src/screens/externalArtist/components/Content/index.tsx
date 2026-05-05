import React, { useCallback, useMemo, useState } from 'react'
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import type { ExternalAlbumBase, ExternalArtist, ExternalArtistBase, ExternalSong } from '@/types'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import ListSeparator from '@/components/ListSeparator'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import MediaTile from '@/screens/explore/components/MediaTile'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { MediaImage } from '@/components/MediaImage'

type Props = {
  artist: ExternalArtist
}

type ExternalArtistContentItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'topTrack'; id: string; song: ExternalSong; index: number }
  | { kind: 'album'; id: string; album: ExternalAlbumBase }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }
  | { kind: 'similar'; id: string; artists: ExternalArtistBase[] }

const INITIAL_RELEASE_ROWS = 3

function SimilarArtistsSection({ artists }: { artists: ExternalArtistBase[] }) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const screenWidth = Dimensions.get('window').width
  const itemSize = Math.min(132, Math.max(112, (screenWidth - 56) / 2.7))

  const renderArtist = useCallback(({ item }: { item: ExternalArtistBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={itemSize}
      radius={itemSize / 2}
      onPress={() => navigation.navigate('externalArtistView', {
        source: item.externalSource,
        artistId: item.externalIds?.deezerId,
        mbid: item.externalIds?.mbid ?? item.id,
        name: item.name,
      })}
    />
  ), [itemSize, navigation])

  if (artists.length === 0) return null

  return (
    <View style={styles.similarSection}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        {t('artist.sections.similarArtists')}
      </Text>
      <FlashList
        horizontal
        data={artists}
        keyExtractor={item => item.id}
        renderItem={renderArtist}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarListContent}
        ItemSeparatorComponent={() => <View style={styles.similarGap} />}
      />
    </View>
  )
}

function formatDuration(duration: string): string {
  const seconds = Number(duration)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function TopTrackRow({
  song,
  index,
  artistName,
  onPress,
}: {
  song: ExternalSong
  index: number
  artistName: string
  onPress?: () => void
}) {
  const { isDarkMode } = useTheme()
  const duration = formatDuration(song.duration)

  return (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <Text style={[styles.trackIndex, isDarkMode && styles.trackIndexDark]}>
        {index + 1}
      </Text>
      <MediaImage cover={song.cover} size="thumb" style={styles.trackCover} />
      <View style={styles.trackText}>
        <Text style={[styles.trackTitle, isDarkMode && styles.trackTitleDark]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[styles.trackSubtitle, isDarkMode && styles.trackSubtitleDark]} numberOfLines={1}>
          {[artistName, duration].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {song.previewUrl ? (
        <View style={[styles.previewButton, isDarkMode && styles.previewButtonDark]}>
          <Ionicons name="play" size={13} color={isDarkMode ? '#fff' : '#111'} />
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

export default function ExternalArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()
  const { t } = useTranslation()
  const { toggle } = usePreviewPlayer()
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(INITIAL_RELEASE_ROWS)
  const [visibleSinglesCount, setVisibleSinglesCount] = useState(INITIAL_RELEASE_ROWS)

  const header = useMemo(() => <Header artist={artist} />, [artist])
  const items = useMemo<ExternalArtistContentItem[]>(() => {
    const rows: ExternalArtistContentItem[] = []

    const topTracks = (artist.topTracks ?? []).slice(0, 5)
    if (topTracks.length > 0) {
      rows.push({ kind: 'section', id: 'top-tracks-section', title: t('artist.sections.topTracks') })
      rows.push(...topTracks.map((song, index) => ({
        kind: 'topTrack' as const,
        id: `top-track-${song.id}`,
        song,
        index,
      })))
    }

    if (artist.albums.length > 0) {
      rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
      const visibleAlbums = artist.albums.slice(0, visibleAlbumsCount)
      rows.push(...visibleAlbums.map(album => ({ kind: 'album' as const, id: `album-${album.id}`, album })))
      if (visibleAlbumsCount < artist.albums.length) {
        rows.push({
          kind: 'showMore',
          id: 'show-more-albums',
          target: 'albums',
          remaining: artist.albums.length - visibleAlbumsCount,
        })
      }
    }

    if (artist.singles.length > 0) {
      rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
      const visibleSingles = artist.singles.slice(0, visibleSinglesCount)
      rows.push(...visibleSingles.map(album => ({ kind: 'album' as const, id: `single-${album.id}`, album })))
      if (visibleSinglesCount < artist.singles.length) {
        rows.push({
          kind: 'showMore',
          id: 'show-more-singles',
          target: 'singles',
          remaining: artist.singles.length - visibleSinglesCount,
        })
      }
    }

    if (artist.similarArtists.length > 0) {
      rows.push({ kind: 'similar', id: 'similar-artists', artists: artist.similarArtists })
    }

    return rows
  }, [artist.albums, artist.similarArtists, artist.singles, artist.topTracks, visibleAlbumsCount, visibleSinglesCount, t])

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        if (item.kind === 'section') {
          return (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                {item.title}
              </Text>
            </View>
          )
        }

        if (item.kind === 'similar') {
          return <SimilarArtistsSection artists={item.artists} />
        }

        if (item.kind === 'topTrack') {
          return (
            <TopTrackRow
              song={item.song}
              index={item.index}
              artistName={artist.name}
              onPress={item.song.previewUrl ? () => toggle(item.song, item.song.previewUrl!) : undefined}
            />
          )
        }

        if (item.kind === 'showMore') {
          return (
            <TouchableOpacity
              style={styles.showMoreRow}
              onPress={() => {
                if (item.target === 'albums') setVisibleAlbumsCount(c => c + 5)
                else setVisibleSinglesCount(c => c + 5)
              }}
              activeOpacity={0.65}
            >
              <View style={[styles.showMoreIcon, isDarkMode && styles.showMoreIconDark]}>
                <Ionicons name="ellipsis-horizontal" size={18} color={isDarkMode ? '#fff' : '#111'} />
              </View>
              <Text style={[styles.showMoreText, isDarkMode && styles.showMoreTextDark]}>
                {item.remaining} more
              </Text>
            </TouchableOpacity>
          )
        }

        return (
          <ExternalAlbumRow
            album={item.album}
            artistName={artist.name}
            onPress={(album) =>
              navigation.navigate('externalAlbumView', {
                source: album.externalSource,
                albumId: album.id,
              })
            }
          />
        )
      }}
      ItemSeparatorComponent={({ leadingItem, trailingItem }) =>
        leadingItem?.kind === 'album' ||
        (leadingItem?.kind === 'topTrack' && trailingItem?.kind === 'topTrack')
          ? <ListSeparator /> : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'android' ? 180 : 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
  sectionTitleDark: {
    color: '#888',
  },
  similarSection: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  similarListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  similarGap: {
    width: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  trackIndex: {
    width: 24,
    color: '#777',
    fontSize: 13,
    textAlign: 'left',
  },
  trackIndexDark: {
    color: '#999',
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  trackText: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  trackTitleDark: {
    color: '#fff',
  },
  trackSubtitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  trackSubtitleDark: {
    color: '#aaa',
  },
  previewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  previewButtonDark: {
    backgroundColor: '#242426',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  showMoreIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  showMoreIconDark: {
    backgroundColor: '#242426',
  },
  showMoreText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  showMoreTextDark: {
    color: '#fff',
  },
})
