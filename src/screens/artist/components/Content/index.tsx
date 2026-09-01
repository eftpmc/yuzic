import React, { useCallback, useMemo, useState } from 'react'
import { radius, statusColor, typography } from '@/constants/design'
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ellipsis, Globe } from 'lucide-react-native'
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
import { isSingleOrEp } from './releaseKind'
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
import Touchable from '@/components/Touchable'

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
  | { kind: 'showUnowned'; id: string; target: 'albums' | 'singles'; count: number }
  | { kind: 'similar'; id: string }
  | { kind: 'bio'; id: string }

const INITIAL_RELEASE_ROWS = 3

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
  const [showUnownedAlbums, setShowUnownedAlbums] = useState(false)
  const [showUnownedSingles, setShowUnownedSingles] = useState(false)
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

      // Owned and unowned releases are kept in separate groups rather than
      // merged chronologically — the row itself (ExternalAlbumRow) double-checks
      // "already in library" independently as a safety net if this dedup
      // misses an edge case. Unowned releases stay behind a "show unowned" tile
      // (reusing the pagination row's look) until the user opts in, so scanning
      // what you actually own isn't interrupted by releases you don't have.
      const missingAlbums = (externalDiscography?.albums ?? [])
        .filter(ext => !matchAlbumToLibrary(ext, localAlbums))
      const missingSingles = (externalDiscography?.singles ?? [])
        .filter(ext => !matchAlbumToLibrary(ext, localAlbums))

      const ownedAlbumItems: ArtistContentItem[] = albums
        .map(album => ({ kind: 'localAlbum' as const, id: `album-${album.id}`, album }))
        .sort((a, b) => compareByReleaseYearDesc(a.album, b.album))
      const ownedSingleItems: ArtistContentItem[] = singles
        .map(album => ({ kind: 'localAlbum' as const, id: `single-${album.id}`, album }))
        .sort((a, b) => compareByReleaseYearDesc(a.album, b.album))
      const unownedAlbumItems: ArtistContentItem[] = missingAlbums
        .map(album => ({ kind: 'externalAlbum' as const, id: `album-ext-${album.id}`, album }))
        .sort((a, b) => compareByReleaseYearDesc(a.album, b.album))
      const unownedSingleItems: ArtistContentItem[] = missingSingles
        .map(album => ({ kind: 'externalAlbum' as const, id: `single-ext-${album.id}`, album }))
        .sort((a, b) => compareByReleaseYearDesc(a.album, b.album))

      if (ownedAlbumItems.length > 0 || unownedAlbumItems.length > 0) {
        rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
        rows.push(...ownedAlbumItems.slice(0, visibleAlbumsCount))
        if (visibleAlbumsCount < ownedAlbumItems.length) {
          rows.push({ kind: 'showMore', id: 'show-more-albums', target: 'albums', remaining: ownedAlbumItems.length - visibleAlbumsCount })
        } else if (unownedAlbumItems.length > 0) {
          if (showUnownedAlbums) {
            rows.push(...unownedAlbumItems)
          } else {
            rows.push({ kind: 'showUnowned', id: 'show-unowned-albums', target: 'albums', count: unownedAlbumItems.length })
          }
        }
      }

      if (ownedSingleItems.length > 0 || unownedSingleItems.length > 0) {
        rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
        rows.push(...ownedSingleItems.slice(0, visibleSinglesCount))
        if (visibleSinglesCount < ownedSingleItems.length) {
          rows.push({ kind: 'showMore', id: 'show-more-singles', target: 'singles', remaining: ownedSingleItems.length - visibleSinglesCount })
        } else if (unownedSingleItems.length > 0) {
          if (showUnownedSingles) {
            rows.push(...unownedSingleItems)
          } else {
            rows.push({ kind: 'showUnowned', id: 'show-unowned-singles', target: 'singles', count: unownedSingleItems.length })
          }
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
  }, [localArtist, externalArtist, localAlbums, externalDiscography, songCountByAlbumId, visibleAlbumsCount, visibleSinglesCount, showUnownedAlbums, showUnownedSingles, t])

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

    // Same tile-row look for both: "keep reading the list" (showMore) and
    // "opt into releases you don't own" (showUnowned) are both progressive
    // disclosure of more rows, just with different icon/copy/trigger.
    if (item.kind === 'showMore' || item.kind === 'showUnowned') {
      const isUnowned = item.kind === 'showUnowned'
      return (
        <Touchable
          style={styles.showMoreRow}
          onPress={() => {
            if (isUnowned) {
              if (item.target === 'albums') setShowUnownedAlbums(true)
              else setShowUnownedSingles(true)
            } else if (item.target === 'albums') {
              setVisibleAlbumsCount(c => c + 5)
            } else {
              setVisibleSinglesCount(c => c + 5)
            }
          }}
        >
          <View style={[styles.showMoreIcon, { backgroundColor: colors.card }]}>
            {isUnowned
              ? <Globe size={18} color={colors.secondary} />
              : <Ellipsis size={18} color={colors.secondary} />
            }
          </View>
          <Text style={[styles.showMoreText, { color: colors.secondary }]}>
            {isUnowned ? t('artist.showUnowned', { count: item.count }) : t('artist.showMore', { count: item.remaining })}
          </Text>
        </Touchable>
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
        subtextOverride={releaseYearLabel(item.album) ?? undefined}
      />
    )
  }, [colors, localArtist, externalArtist, navigation, navigateToAlbum, setVisibleAlbumsCount, setVisibleSinglesCount, setShowUnownedAlbums, setShowUnownedSingles, t])

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
    ...typography.navigationTitle,
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
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    ...typography.micro,
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
    borderRadius: radius.sm,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreText: {
    ...typography.button,
  },
})
