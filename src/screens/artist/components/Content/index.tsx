import React, { useCallback, useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useDownload } from '@/contexts/DownloadContext'
import type { Album, Artist, ExternalArtistBase } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import ListSeparator from '@/components/ListSeparator'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTracks } from '@/hooks/tracks'
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
} from '@/utils/downloads/collectionState'
import { useTranslation } from 'react-i18next'
import { useSimilarArtists } from '@/hooks/artists'
import MediaTile from '@/screens/explore/components/MediaTile'

type Props = {
  artist: Artist
}

type ArtistContentItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'album'; id: string; album: Album }
  | { kind: 'similar'; id: string }

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
      onPress={() => navigation.navigate('externalArtistView', { mbid: item.id, name: item.name })}
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
        contentContainerStyle={styles.similarList}
        ItemSeparatorComponent={() => <View style={styles.similarGap} />}
      />
    </View>
  )
}

export default function ArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()
  const { t } = useTranslation()
  const { tracks } = useTracks()
  const { getAllDownloadedTracks } = useDownload()

  const downloadedTrackIds = React.useMemo(
    () => buildDownloadedTrackIdSet(getAllDownloadedTracks()),
    [getAllDownloadedTracks]
  )
  const downloadedAlbumIds = React.useMemo(
    () => getFullyDownloadedAlbumIds(tracks, downloadedTrackIds),
    [tracks, downloadedTrackIds]
  )

  const items = useMemo<ArtistContentItem[]>(() => {
    const albums = artist.ownedAlbums.filter(album => !isSingleOrEp(album))
    const singles = artist.ownedAlbums.filter(isSingleOrEp)
    const rows: ArtistContentItem[] = []

    if (albums.length > 0) {
      rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
      rows.push(...albums.map(album => ({ kind: 'album' as const, id: `album-${album.id}`, album })))
    }

    if (singles.length > 0) {
      rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
      rows.push(...singles.map(album => ({ kind: 'album' as const, id: `single-${album.id}`, album })))
    }

    rows.push({ kind: 'similar', id: 'similar-artists' })
    return rows
  }, [artist.ownedAlbums, t])

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

        return (
          <AlbumRow
            album={item.album}
            showDownloadedDot
            isDownloaded={downloadedAlbumIds.has(String(item.album.id))}
            onPress={(album) =>
              navigation.navigate('albumView', { id: album.id })
            }
          />
        )
      }}
      ItemSeparatorComponent={({ leadingItem }) =>
        leadingItem?.kind === 'album' ? <ListSeparator /> : null
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionTitleDark: {
    color: '#888',
  },
  similarSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  similarList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  similarGap: {
    width: 12,
  },
})
