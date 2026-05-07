import React, { useCallback, useMemo, useState } from 'react'
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import type { Album, Artist, ExternalArtistBase } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { useSimilarArtists } from '@/hooks/artists'
import MediaTile from '@/screens/explore/components/MediaTile'

type Props = {
  artist: Artist
}

type ArtistContentItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'album'; id: string; album: Album }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }
  | { kind: 'similar'; id: string }

const INITIAL_RELEASE_ROWS = 3

function isSingleOrEp(album: Album): boolean {
  const songCount = album.songs?.length ?? 0
  if (songCount > 0 && songCount <= 6) return true

  const title = album.title.toLowerCase()
  return title.includes('single') || title.includes(' ep')
}

function SimilarArtistsSection({ artist }: { artist: Artist }) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { data = [] } = useSimilarArtists({
    mbid: artist.mbid,
    name: artist.name,
    excludeName: artist.name,
    limit: 8,
  })
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

  if (data.length === 0) return null

  return (
    <View style={styles.similarSection}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        {t('artist.sections.similarArtists')}
      </Text>
      <FlashList
        horizontal
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderArtist}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarListContent}
        ItemSeparatorComponent={() => <View style={styles.similarGap} />}
      />
    </View>
  )
}

export default function ArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()
  const { t } = useTranslation()
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(INITIAL_RELEASE_ROWS)
  const [visibleSinglesCount, setVisibleSinglesCount] = useState(INITIAL_RELEASE_ROWS)

  const items = useMemo<ArtistContentItem[]>(() => {
    const albums = artist.ownedAlbums.filter(album => !isSingleOrEp(album))
    const singles = artist.ownedAlbums.filter(isSingleOrEp)
    const rows: ArtistContentItem[] = []

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
  }, [artist.ownedAlbums, visibleAlbumsCount, visibleSinglesCount, t])

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Header artist={artist} />}
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
          <AlbumRow
            album={item.album}
            onPress={(album) =>
              navigation.navigate('albumView', { id: album.id })
            }
          />
        )
      }}
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
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  showMoreIcon: {
    width: 52,
    height: 52,
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
