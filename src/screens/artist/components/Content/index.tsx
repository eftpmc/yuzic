import React, { useCallback, useMemo, useState } from 'react'
import { statusColor } from '@/constants/design'
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ellipsis } from 'lucide-react-native'
import type { AlbumBase, Artist, ExternalAlbumBase, ExternalArtist, ExternalArtistBase } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import Header, { ArtistHeaderBar } from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { useArtistAlbums, useSimilarArtists } from '@/hooks/artists'
import { useArtistTopTracks } from '@/hooks/artists/useArtistTopTracks'
import { useArtistExternalDiscography } from '@/hooks/artists/useArtistExternalDiscography'
import { matchAlbumToLibrary } from '@/hooks/libraryMatch'
import { compareByReleaseYearDesc, releaseYearLabel } from './discography'
import { useTracks } from '@/hooks/tracks'
import MediaTile from '@/screens/home/components/MediaTile'
import MostPlayedSection from './MostPlayedSection'
import PopularOnDeezerSection from './PopularOnDeezerSection'
import BioSection from './BioSection'
import { findArtistsWithSharedGenres, type LocalArtistSummary } from './localSimilarArtists'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
import { useDeezerSimilarArtistsEnabled, useDeezerTopTracksEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { useSelector } from 'react-redux'
import { selectLastFmSimilarArtistsEnabled } from '@/utils/redux/selectors/lastfmSelectors'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'
import { selectLibraryAlbums } from '@/utils/redux/selectors/librarySelectors'

type Props = {
  localArtist: Artist | null
  externalArtist: ExternalArtist | null
}

type ArtistContentItem =
  | { kind: 'mostPlayed'; id: string }
  | { kind: 'popularOnDeezer'; id: string }
  | { kind: 'section'; id: string; title: string }
  | { kind: 'localAlbum'; id: string; album: AlbumBase }
  | { kind: 'externalAlbum'; id: string; album: ExternalAlbumBase }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }
  | { kind: 'similar'; id: string }
  | { kind: 'bio'; id: string }

const INITIAL_RELEASE_ROWS = 3

function isSingleOrEp(album: AlbumBase, songCount: number): boolean {
  if (songCount > 0 && songCount <= 6) return true

  const title = album.title.toLowerCase()
  return title.includes('single') || title.includes(' ep')
}

const LASTFM_COLOR = '#D51007'
const LOCAL_COLOR = statusColor.success

function SimilarArtistsSubSection<T extends ExternalArtistBase | LocalArtistSummary>({
  data, itemSize, keyPrefix, badge, onPressItem,
}: {
  data: T[]
  itemSize: number
  keyPrefix: string
  badge: { color: string; letter: string }
  onPressItem: (item: T) => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)

  const renderArtist = useCallback(({ item }: { item: T }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={itemSize}
      radius={itemSize / 2}
      onPress={() => onPressItem(item)}
    />
  ), [itemSize, onPressItem])

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

function LocalSimilarArtistsSection({ artist }: { artist: Artist }) {
  const navigation = useNavigation<any>()
  const { width: screenWidth } = useWindowDimensions()
  const itemSize = Math.min(132, Math.max(112, (screenWidth - 56) / 2.7))

  const { navigateToArtist } = useMatchedNavigation()
  const deezerEnabled = useDeezerSimilarArtistsEnabled()
  const lastfmEnabled = useSelector(selectLastFmSimilarArtistsEnabled)
  const libraryAlbums = useSelector(selectLibraryAlbums)

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

  const localSimilar = useMemo(
    () => findArtistsWithSharedGenres(artist.id, libraryAlbums),
    [artist.id, libraryAlbums]
  )

  return (
    <>
      <SimilarArtistsSubSection
        data={localSimilar}
        itemSize={itemSize}
        keyPrefix="local"
        badge={{ color: LOCAL_COLOR, letter: 'L' }}
        onPressItem={item => navigation.push('artistView', { id: item.id })}
      />
      {deezerEnabled && deezerSimilar.length > 0 && (
        <SimilarArtistsSubSection
          data={deezerSimilar}
          itemSize={itemSize}
          keyPrefix="deezer"
          badge={{ color: '#A238CA', letter: 'D' }}
          onPressItem={item => navigateToArtist(item)}
        />
      )}
      {lastfmEnabled && lastfmSimilar.length > 0 && (
        <SimilarArtistsSubSection
          data={lastfmSimilar}
          itemSize={itemSize}
          keyPrefix="lastfm"
          badge={{ color: LASTFM_COLOR, letter: 'L' }}
          onPressItem={item => navigateToArtist(item)}
        />
      )}
    </>
  )
}

function ExternalSimilarArtistsSection({ similarArtists }: { similarArtists: ExternalArtistBase[] }) {
  const { width: screenWidth } = useWindowDimensions()
  const itemSize = Math.min(132, Math.max(112, (screenWidth - 56) / 2.7))
  const { navigateToArtist } = useMatchedNavigation()

  return (
    <SimilarArtistsSubSection
      data={similarArtists}
      itemSize={itemSize}
      keyPrefix="deezer"
      badge={{ color: '#A238CA', letter: 'D' }}
      onPressItem={item => navigateToArtist(item)}
    />
  )
}

export default function ArtistContent({ localArtist, externalArtist }: Props) {
  const navigation = useNavigation<any>()
  const { navigateToAlbum } = useMatchedNavigation()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(INITIAL_RELEASE_ROWS)
  const [visibleSinglesCount, setVisibleSinglesCount] = useState(INITIAL_RELEASE_ROWS)
  const localAlbums = useArtistAlbums(localArtist?.id ?? '')
  const { tracks: libraryTracks } = useTracks()
  const { data: externalDiscography } = useArtistExternalDiscography(localArtist?.name ?? null, !!localArtist)

  const songCountByAlbumId = useMemo(() => {
    const counts = new Map<string, number>()
    libraryTracks.forEach(track => {
      counts.set(track.albumId, (counts.get(track.albumId) ?? 0) + 1)
    })
    return counts
  }, [libraryTracks])

  const items = useMemo<ArtistContentItem[]>(() => {
    const rows: ArtistContentItem[] = []

    if (localArtist) {
      rows.push({ kind: 'mostPlayed', id: 'most-played' })
      rows.push({ kind: 'popularOnDeezer', id: 'popular-on-deezer' })

      const albums = localAlbums.filter(album => !isSingleOrEp(album, songCountByAlbumId.get(album.id) ?? 0))
      const singles = localAlbums.filter(album => isSingleOrEp(album, songCountByAlbumId.get(album.id) ?? 0))

      // Owned releases merged chronologically with whatever the enabled
      // external sources have for this artist that isn't already matched to
      // something owned — the row itself (ExternalAlbumRow) double-checks
      // "already in library" independently as a safety net if this dedup
      // misses an edge case.
      const missingAlbums = (externalDiscography?.albums ?? [])
        .filter(ext => !matchAlbumToLibrary(ext, localAlbums))
      const missingSingles = (externalDiscography?.singles ?? [])
        .filter(ext => !matchAlbumToLibrary(ext, localAlbums))

      const albumItems: ArtistContentItem[] = [
        ...albums.map(album => ({ kind: 'localAlbum' as const, id: `album-${album.id}`, album })),
        ...missingAlbums.map(album => ({ kind: 'externalAlbum' as const, id: `album-ext-${album.id}`, album })),
      ].sort((a, b) => compareByReleaseYearDesc(a.album, b.album))
      const singleItems: ArtistContentItem[] = [
        ...singles.map(album => ({ kind: 'localAlbum' as const, id: `single-${album.id}`, album })),
        ...missingSingles.map(album => ({ kind: 'externalAlbum' as const, id: `single-ext-${album.id}`, album })),
      ].sort((a, b) => compareByReleaseYearDesc(a.album, b.album))

      if (albumItems.length > 0) {
        rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
        rows.push(...albumItems.slice(0, visibleAlbumsCount))
        if (visibleAlbumsCount < albumItems.length) {
          rows.push({ kind: 'showMore', id: 'show-more-albums', target: 'albums', remaining: albumItems.length - visibleAlbumsCount })
        }
      }

      if (singleItems.length > 0) {
        rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
        rows.push(...singleItems.slice(0, visibleSinglesCount))
        if (visibleSinglesCount < singleItems.length) {
          rows.push({ kind: 'showMore', id: 'show-more-singles', target: 'singles', remaining: singleItems.length - visibleSinglesCount })
        }
      }

      rows.push({ kind: 'similar', id: 'similar-artists' })
      rows.push({ kind: 'bio', id: 'bio' })
    } else if (externalArtist) {
      rows.push({ kind: 'popularOnDeezer', id: 'popular-on-deezer' })

      const sortedAlbums = [...externalArtist.albums].sort(compareByReleaseYearDesc)
      const sortedSingles = [...externalArtist.singles].sort(compareByReleaseYearDesc)

      if (sortedAlbums.length > 0) {
        rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
        const visibleAlbums = sortedAlbums.slice(0, visibleAlbumsCount)
        rows.push(...visibleAlbums.map(album => ({ kind: 'externalAlbum' as const, id: `album-${album.id}`, album })))
        if (visibleAlbumsCount < sortedAlbums.length) {
          rows.push({ kind: 'showMore', id: 'show-more-albums', target: 'albums', remaining: sortedAlbums.length - visibleAlbumsCount })
        }
      }

      if (sortedSingles.length > 0) {
        rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
        const visibleSingles = sortedSingles.slice(0, visibleSinglesCount)
        rows.push(...visibleSingles.map(album => ({ kind: 'externalAlbum' as const, id: `single-${album.id}`, album })))
        if (visibleSinglesCount < sortedSingles.length) {
          rows.push({ kind: 'showMore', id: 'show-more-singles', target: 'singles', remaining: sortedSingles.length - visibleSinglesCount })
        }
      }

      if (externalArtist.similarArtists.length > 0) {
        rows.push({ kind: 'similar', id: 'similar-artists' })
      }
      rows.push({ kind: 'bio', id: 'bio' })
    }

    return rows
  }, [localArtist, externalArtist, localAlbums, externalDiscography, songCountByAlbumId, visibleAlbumsCount, visibleSinglesCount, t])

  const renderItem = useCallback(({ item }: { item: ArtistContentItem }) => {
    if (item.kind === 'mostPlayed') {
      return localArtist ? <MostPlayedSection artist={localArtist} /> : null
    }

    if (item.kind === 'popularOnDeezer') {
      return (
        <PopularOnDeezerSectionResolver
          localArtist={localArtist}
          externalArtist={externalArtist}
        />
      )
    }

    if (item.kind === 'bio') {
      return (
        <BioSectionResolver
          localArtist={localArtist}
          externalArtist={externalArtist}
        />
      )
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
      return localArtist
        ? <LocalSimilarArtistsSection artist={localArtist} />
        : <ExternalSimilarArtistsSection similarArtists={externalArtist?.similarArtists ?? []} />
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

    if (item.kind === 'localAlbum') {
      return (
        <AlbumRow
          album={item.album}
          onPress={(album) => navigation.push('albumView', { id: album.id })}
          subtextOverride={releaseYearLabel(item.album) ?? undefined}
        />
      )
    }

    return (
      <ExternalAlbumRow
        album={item.album}
        onPress={(album) => navigateToAlbum(album)}
        showExternalBadge={!!localArtist}
        subtextOverride={releaseYearLabel(item.album) ?? undefined}
      />
    )
  }, [colors, localArtist, externalArtist, navigation, navigateToAlbum, setVisibleAlbumsCount, setVisibleSinglesCount, t])

  return (
    <View style={{ flex: 1 }}>
      <ArtistHeaderBar localArtist={localArtist} externalArtist={externalArtist} />
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Header localArtist={localArtist} externalArtist={externalArtist} showNavigation={false} />}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? 180 : 140,
          backgroundColor: colors.background,
        }}
      />
    </View>
  )
}

// PopularOnDeezerSection needs different data plumbing per mode (local mode
// fetches via useArtistTopTracks; external mode already has the data fetched)
// — isolated here so that hook call stays unconditional within its own
// component regardless of which branch renderItem takes.
function PopularOnDeezerSectionResolver({ localArtist, externalArtist }: {
  localArtist: Artist | null
  externalArtist: ExternalArtist | null
}) {
  const deezerTopTracksEnabled = useDeezerTopTracksEnabled()
  const { topTracks: localTopTracks } = useArtistTopTracks({
    name: localArtist?.name ?? '',
    mbid: localArtist?.mbid,
    enabled: !!localArtist && deezerTopTracksEnabled,
  })

  if (localArtist) {
    return <PopularOnDeezerSection topTracks={localTopTracks} artistId={localArtist.id} artistName={localArtist.name} />
  }
  if (externalArtist) {
    return (
      <PopularOnDeezerSection
        topTracks={externalArtist.topTracks ?? []}
        artistId={externalArtist.id}
        artistName={externalArtist.name}
      />
    )
  }
  return null
}

// Same per-mode plumbing as PopularOnDeezerSectionResolver: local mode pulls
// the Deezer biography via useArtistTopTracks (the same query the resolver
// above runs, so react-query dedupes it), external mode already has it on
// the artist. Gated by the Deezer Top Tracks setting in local mode, matching
// the pre-unification behavior where the bio lived inside TopTracksSection.
function BioSectionResolver({ localArtist, externalArtist }: {
  localArtist: Artist | null
  externalArtist: ExternalArtist | null
}) {
  const deezerTopTracksEnabled = useDeezerTopTracksEnabled()
  const { biography: localBiography } = useArtistTopTracks({
    name: localArtist?.name ?? '',
    mbid: localArtist?.mbid,
    enabled: !!localArtist && deezerTopTracksEnabled,
  })

  return <BioSection biography={localArtist ? localBiography : externalArtist?.biography} />
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
