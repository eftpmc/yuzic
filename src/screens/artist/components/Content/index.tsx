import React, { useCallback, useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ellipsis } from 'lucide-react-native'
import type { AlbumBase, Artist, ExternalArtistBase } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { useArtistAlbums, useSimilarArtists } from '@/hooks/artists'
import { useArtistTopTracks } from '@/hooks/artists/useArtistTopTracks'
import { useTracks } from '@/hooks/tracks'
import MediaTile from '@/screens/home/components/MediaTile'
import TopTracksSection from './TopTracksSection'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
import { useDeezerSimilarArtistsEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { useSelector } from 'react-redux'
import { selectLastFmSimilarArtistsEnabled } from '@/utils/redux/selectors/lastfmSelectors'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'

type Props = {
  artist: Artist
}

type ArtistContentItem =
  | { kind: 'topTracks'; id: string }
  | { kind: 'section'; id: string; title: string }
  | { kind: 'album'; id: string; album: AlbumBase }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }
  | { kind: 'similar'; id: string }

const INITIAL_RELEASE_ROWS = 3

function isSingleOrEp(album: AlbumBase, songCount: number): boolean {
  if (songCount > 0 && songCount <= 6) return true

  const title = album.title.toLowerCase()
  return title.includes('single') || title.includes(' ep')
}

const LASTFM_COLOR = '#D51007'

function SimilarArtistsSubSection({ data, itemSize, keyPrefix, badge }: {
  data: ExternalArtistBase[]
  itemSize: number
  keyPrefix: string
  badge: { color: string; letter: string }
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { navigateToArtist } = useMatchedNavigation()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)

  const renderArtist = useCallback(({ item }: { item: ExternalArtistBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={itemSize}
      radius={itemSize / 2}
      onPress={() => navigateToArtist(item)}
    />
  ), [itemSize, navigateToArtist])

  if (data.length === 0) return null

  return (
    <View style={styles.similarSection}>
      <View style={styles.similarTitleRow}>
        {showSourceHeaders && (
          <View style={[styles.sourceBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.sourceBadgeLetter}>{badge.letter}</Text>
          </View>
        )}
        <Text style={[styles.sectionTitle, styles.sectionTitleNopad, { color: colors.secondary }]}>
          {t('artist.sections.similarArtists')}
        </Text>
      </View>
      <FlashList
        horizontal
        data={data}
        keyExtractor={item => `${keyPrefix}-${item.id}`}
        renderItem={renderArtist}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarListContent}
        ItemSeparatorComponent={() => <View style={styles.similarGap} />}
      />
    </View>
  )
}

function SimilarArtistsSection({ artist }: { artist: Artist }) {
  const { width: screenWidth } = useWindowDimensions()
  const itemSize = Math.min(132, Math.max(112, (screenWidth - 56) / 2.7))

  const deezerEnabled = useDeezerSimilarArtistsEnabled()
  const lastfmEnabled = useSelector(selectLastFmSimilarArtistsEnabled)

  const { similarArtists: deezerSimilar } = useArtistTopTracks({
    name: artist.name,
    mbid: artist.mbid,
    enabled: deezerEnabled,
  })

  const { data: lastfmSimilar = [] } = useSimilarArtists({
    mbid: artist.mbid,
    name: artist.name,
    excludeName: artist.name,
    limit: 8,
    enabled: lastfmEnabled,
  })

  return (
    <>
      {deezerEnabled && deezerSimilar.length > 0 && (
        <SimilarArtistsSubSection
          data={deezerSimilar}
          itemSize={itemSize}
          keyPrefix="deezer"
          badge={{ color: '#A238CA', letter: 'D' }}
        />
      )}
      {lastfmEnabled && lastfmSimilar.length > 0 && (
        <SimilarArtistsSubSection
          data={lastfmSimilar}
          itemSize={itemSize}
          keyPrefix="lastfm"
          badge={{ color: LASTFM_COLOR, letter: 'L' }}
        />
      )}
    </>
  )
}

export default function ArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(INITIAL_RELEASE_ROWS)
  const [visibleSinglesCount, setVisibleSinglesCount] = useState(INITIAL_RELEASE_ROWS)
  const artistAlbums = useArtistAlbums(artist.id)
  const { tracks: libraryTracks } = useTracks()

  const songCountByAlbumId = useMemo(() => {
    const counts = new Map<string, number>()
    libraryTracks.forEach(track => {
      counts.set(track.albumId, (counts.get(track.albumId) ?? 0) + 1)
    })
    return counts
  }, [libraryTracks])

  const items = useMemo<ArtistContentItem[]>(() => {
    const albums = artistAlbums.filter(album => !isSingleOrEp(album, songCountByAlbumId.get(album.id) ?? 0))
    const singles = artistAlbums.filter(album => isSingleOrEp(album, songCountByAlbumId.get(album.id) ?? 0))
    const rows: ArtistContentItem[] = []

    rows.push({ kind: 'topTracks', id: 'top-tracks' })

    if (albums.length > 0) {
      rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
      const visibleAlbums = albums.slice(0, visibleAlbumsCount)
      rows.push(...visibleAlbums.map(album => ({ kind: 'album' as const, id: `album-${album.id}`, album })))
      if (visibleAlbumsCount < albums.length) {
        rows.push({
          kind: 'showMore',
          id: 'show-more-albums',
          target: 'albums',
          remaining: albums.length - visibleAlbumsCount,
        })
      }
    }

    if (singles.length > 0) {
      rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
      const visibleSingles = singles.slice(0, visibleSinglesCount)
      rows.push(...visibleSingles.map(album => ({ kind: 'album' as const, id: `single-${album.id}`, album })))
      if (visibleSinglesCount < singles.length) {
        rows.push({
          kind: 'showMore',
          id: 'show-more-singles',
          target: 'singles',
          remaining: singles.length - visibleSinglesCount,
        })
      }
    }

    rows.push({ kind: 'similar', id: 'similar-artists' })
    return rows
  }, [artistAlbums, songCountByAlbumId, visibleAlbumsCount, visibleSinglesCount, t])

  const renderItem = useCallback(({ item }: { item: ArtistContentItem }) => {
    if (item.kind === 'topTracks') {
      return <TopTracksSection artist={artist} />
    }

    if (item.kind === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
            {item.title}
          </Text>
        </View>
      )
    }

    if (item.kind === 'similar') {
      return <SimilarArtistsSection artist={artist} />
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
            <Ellipsis size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.showMoreText, { color: colors.secondary }]}>
            {t('artist.showMore', { count: item.remaining })}
          </Text>
        </TouchableOpacity>
      )
    }

    return (
      <AlbumRow
        album={item.album}
        onPress={(album) => navigation.navigate('albumView', { id: album.id })}
      />
    )
  }, [colors, artist, navigation, setVisibleAlbumsCount, setVisibleSinglesCount])

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
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  sectionTitleNopad: {
    paddingHorizontal: 0,
  },
  similarSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  similarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sourceBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  similarListContent: {
    paddingHorizontal: 16,
  },
  similarGap: {
    width: 12,
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
})
