import React, { useCallback, useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import type { ExternalAlbumBase, ExternalArtist, ExternalArtistBase, ExternalSong } from '@/types'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import MediaTile from '@/screens/home/components/MediaTile'
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer'
import { MediaImage } from '@/components/MediaImage'
import { formatSongDuration } from '@/utils/formatDuration'

type Props = {
  artist: ExternalArtist
}

type ExternalArtistContentItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'topTrack'; id: string; song: ExternalSong; index: number }
  | { kind: 'toggleTracks'; id: string; expanded: boolean; hidden: number }
  | { kind: 'album'; id: string; album: ExternalAlbumBase }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }
  | { kind: 'similar'; id: string; artists: ExternalArtistBase[] }

const INITIAL_RELEASE_ROWS = 3

function SimilarArtistsSection({ artists }: { artists: ExternalArtistBase[] }) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
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
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
  const { colors } = useTheme()
  const duration = formatSongDuration(song.duration)

  return (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <Text style={[styles.trackIndex, { color: colors.subtext }]}>
        {index + 1}
      </Text>
      <MediaImage cover={song.cover} size="thumb" style={styles.trackCover} />
      <View style={styles.trackText}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[styles.trackSubtitle, { color: colors.subtext }]} numberOfLines={1}>
          {[artistName, duration].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {song.previewUrl ? (
        <View style={[styles.previewButton, { backgroundColor: colors.card }]}>
          <Ionicons name="play" size={13} color={colors.text} />
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

export default function ExternalArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { toggleInAlbum } = usePreviewPlayer()

  const topTrackQueue = useMemo(() =>
    (artist.topTracks ?? [])
      .filter(s => !!s.previewUrl)
      .map(s => externalSongToTrack(s, s.previewUrl!)),
    [artist.topTracks]
  )
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(INITIAL_RELEASE_ROWS)
  const [visibleSinglesCount, setVisibleSinglesCount] = useState(INITIAL_RELEASE_ROWS)
  const [showAllTracks, setShowAllTracks] = useState(false)

  const items = useMemo<ExternalArtistContentItem[]>(() => {
    const rows: ExternalArtistContentItem[] = []

    const allTopTracks = (artist.topTracks ?? []).slice(0, 10)
    if (allTopTracks.length > 0) {
      const visibleTracks = showAllTracks ? allTopTracks : allTopTracks.slice(0, 5)
      rows.push({ kind: 'section', id: 'top-tracks-section', title: t('artist.sections.topTracks') })
      rows.push(...visibleTracks.map((song, index) => ({
        kind: 'topTrack' as const,
        id: `top-track-${song.id}`,
        song,
        index,
      })))
      if (allTopTracks.length > 5) {
        rows.push({
          kind: 'toggleTracks',
          id: 'toggle-tracks',
          expanded: showAllTracks,
          hidden: allTopTracks.length - 5,
        })
      }
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
  }, [artist.albums, artist.similarArtists, artist.singles, artist.topTracks, visibleAlbumsCount, visibleSinglesCount, showAllTracks, t])

  const renderItem = useCallback(({ item }: { item: ExternalArtistContentItem }) => {
    if (item.kind === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
          onPress={item.song.previewUrl
            ? () => toggleInAlbum(item.song, item.song.previewUrl!, topTrackQueue, artist.id, artist.name)
            : undefined}
        />
      )
    }

    if (item.kind === 'toggleTracks') {
      return (
        <View style={styles.toggleTracksRow}>
          <TouchableOpacity
            style={[styles.toggleTracksButton, { backgroundColor: colors.card }]}
            onPress={() => setShowAllTracks(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleTracksText, { color: colors.text }]}>
              {item.expanded ? 'See less' : 'See more'}
            </Text>
          </TouchableOpacity>
        </View>
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
          <View style={[styles.showMoreIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </View>
          <Text style={[styles.showMoreText, { color: colors.text }]}>
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
  }, [colors, artist, navigation, toggleInAlbum, topTrackQueue])

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Header artist={artist} />}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'android' ? 180 : 140,
        backgroundColor: colors.background,
      }}
    />
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  similarSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  similarListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
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
    width: 16,
    fontSize: 13,
    textAlign: 'left',
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
    fontSize: 15,
    fontWeight: '600',
  },
  trackSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  previewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  showMoreIcon: {
    width: 64,
    height: 64,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTracksRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleTracksButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleTracksText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
