import React, { useCallback, useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import type { ExternalAlbumBase, ExternalArtist, ExternalArtistBase } from '@/types'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import ListSeparator from '@/components/ListSeparator'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import MediaTile from '@/screens/explore/components/MediaTile'

type Props = {
  artist: ExternalArtist
}

type ExternalArtistContentItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'album'; id: string; album: ExternalAlbumBase }
  | { kind: 'similar'; id: string; artists: ExternalArtistBase[] }

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
      onPress={() => navigation.navigate('externalArtistView', { mbid: item.id, name: item.name })}
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
        contentContainerStyle={styles.similarList}
        ItemSeparatorComponent={() => <View style={styles.similarGap} />}
      />
    </View>
  )
}

export default function ExternalArtistContent({ artist }: Props) {
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()
  const { t } = useTranslation()

  const header = useMemo(() => <Header artist={artist} />, [artist])
  const items = useMemo<ExternalArtistContentItem[]>(() => {
    const rows: ExternalArtistContentItem[] = []

    if (artist.albums.length > 0) {
      rows.push({ kind: 'section', id: 'albums-section', title: t('artist.sections.albums') })
      rows.push(...artist.albums.map(album => ({ kind: 'album' as const, id: `album-${album.id}`, album })))
    }

    if (artist.singles.length > 0) {
      rows.push({ kind: 'section', id: 'singles-section', title: t('artist.sections.singles') })
      rows.push(...artist.singles.map(album => ({ kind: 'album' as const, id: `single-${album.id}`, album })))
    }

    if (artist.similarArtists.length > 0) {
      rows.push({ kind: 'similar', id: 'similar-artists', artists: artist.similarArtists })
    }

    return rows
  }, [artist.albums, artist.similarArtists, artist.singles, t])

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

        return (
          <ExternalAlbumRow
            album={item.album}
            artistName={artist.name}
            onPress={(album) =>
              navigation.navigate('externalAlbumView', { albumId: album.id })
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
