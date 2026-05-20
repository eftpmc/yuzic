import React, { useCallback, useMemo } from 'react'
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

const H_PADDING = 16
const TILE_GAP = 12
const VISIBLE_TILES = 2.5
const RELATED_LIMIT = 30
const TARGET_ALBUMS = 8

type Props = {
  artistName: string
  artistId: string
  excludeAlbumId: string
}

async function fetchRelatedAlbums(
  artistName: string,
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const seed = await deezer.resolveDeezerArtistByName(artistName)
  if (!seed) return []
  const related = await deezer.getDeezerRelatedArtists(seed.id, RELATED_LIMIT)
  const fresh = related.filter(a => !libraryArtistNames.has(a.name.toLowerCase()))
  return collectCoveredAlbumsForArtists(fresh, { targetAlbums: TARGET_ALBUMS })
}

export default function AlbumRecommendedSection({ artistName, artistId, excludeAlbumId }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const enabled = useDeezerAlbumRecommendationsEnabled()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const { artists } = useArtists()
  const { navigateToAlbum } = useMatchedNavigation()

  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES

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
    paddingTop: 24,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
})
