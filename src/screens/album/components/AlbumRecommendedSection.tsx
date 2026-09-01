import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { useArtists } from '@/hooks/artists'
import { useDeezerAlbumRecommendationsEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import * as deezer from '@/api/deezer'
import { collectCoveredAlbumsForArtists } from '@/features/home/utils/albumDiscovery'
import { QueryKeys } from '@/enums/queryKeys'
import { STALE_DEEZER_DISCOVERY } from '@/features/home/constants'
import MediaTile from '@/screens/home/components/MediaTile'
import type { ExternalAlbumBase } from '@/types'
import {
  ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
  ALBUM_RECOMMENDATION_TILE_GAP,
  ALBUM_RECOMMENDATION_VISIBLE_TILES,
  ALBUM_RECOMMENDATION_RELATED_LIMIT,
  ALBUM_RECOMMENDATION_TARGET_ALBUMS,
} from '@/constants/album';
import { radius, spacing, typography } from '@/constants/design';

type Props = {
  artistName: string
  excludeAlbumId: string
}

async function fetchRelatedAlbums(
  artistName: string,
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const seed = await deezer.resolveDeezerArtistByName(artistName)
  if (!seed) return []
  const related = await deezer.getDeezerRelatedArtists(seed.id, ALBUM_RECOMMENDATION_RELATED_LIMIT)
  const fresh = related.filter(a => !libraryArtistNames.has(a.name.toLowerCase()))
  return collectCoveredAlbumsForArtists(fresh, { targetAlbums: ALBUM_RECOMMENDATION_TARGET_ALBUMS })
}

export default function AlbumRecommendedSection({ artistName, excludeAlbumId }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const enabled = useDeezerAlbumRecommendationsEnabled()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const { artists } = useArtists()
  const { navigateToAlbum } = useMatchedNavigation()

  const tileWidth = (screenWidth - ALBUM_RECOMMENDATION_HORIZONTAL_PADDING * 2 - ALBUM_RECOMMENDATION_TILE_GAP * 2) / ALBUM_RECOMMENDATION_VISIBLE_TILES

  const libraryArtistNames = useMemo(
    () => new Set(artists.map(a => a.name.toLowerCase())),
    [artists]
  )

  const { data: albums = [] } = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreBecauseYouListened, 'album-rec', artistName],
    queryFn: () => fetchRelatedAlbums(artistName, libraryArtistNames),
    enabled: enabled && !!artistName,
    staleTime: STALE_DEEZER_DISCOVERY,
    networkMode: 'online',
  })

  const filtered = useMemo(() => albums.filter(a => a.id !== excludeAlbumId), [albums, excludeAlbumId])
  const covers = useMemo(() => filtered.map(a => a.cover), [filtered])
  usePrefetchCovers(covers, 'grid')

  if (!enabled || filtered.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {showSourceHeaders && (
          <View style={[styles.badge, { backgroundColor: '#A238CA' }]}>
            <Text style={styles.badgeLetter}>D</Text>
          </View>
        )}
        <Text style={[styles.title, { color: colors.secondary }]}>{t('album.mightAlsoLike')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {filtered.map(album => (
          <MediaTile
            key={album.id}
            cover={album.cover}
            title={album.title}
            subtitle={album.subtext ?? ''}
            size={tileWidth}
            radius={6}
            onPress={() => {
              prefetchCovers([album.cover], 'detail')
              navigateToAlbum(album)
            }}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
    marginBottom: spacing.md,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    ...typography.micro,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    ...typography.sectionTitle,
  },
  scroll: {
    paddingHorizontal: ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
    gap: ALBUM_RECOMMENDATION_TILE_GAP,
  },
})
