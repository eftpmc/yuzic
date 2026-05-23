import React, { useCallback, useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Ellipsis } from 'lucide-react-native'
import type { ExternalAlbumBase, ExternalArtist } from '@/types'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'

type Props = {
  artist: ExternalArtist
}

type Item =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'album'; id: string; album: ExternalAlbumBase }
  | { kind: 'showMore'; id: string; target: 'albums' | 'singles'; remaining: number }

const INITIAL_ROWS = 3

export default function ExternalArtistContent({ artist }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { navigateToAlbum } = useMatchedNavigation()
  const [visibleAlbums, setVisibleAlbums] = useState(INITIAL_ROWS)
  const [visibleSingles, setVisibleSingles] = useState(INITIAL_ROWS)

  const items = useMemo<Item[]>(() => {
    const rows: Item[] = []

    if (artist.albums.length > 0) {
      rows.push({ kind: 'section', id: 'albums', title: t('artist.sections.albums') })
      artist.albums.slice(0, visibleAlbums).forEach(a =>
        rows.push({ kind: 'album', id: `album-${a.id}`, album: a })
      )
      if (visibleAlbums < artist.albums.length) {
        rows.push({ kind: 'showMore', id: 'more-albums', target: 'albums', remaining: artist.albums.length - visibleAlbums })
      }
    }

    if (artist.singles.length > 0) {
      rows.push({ kind: 'section', id: 'singles', title: t('artist.sections.singles') })
      artist.singles.slice(0, visibleSingles).forEach(a =>
        rows.push({ kind: 'album', id: `single-${a.id}`, album: a })
      )
      if (visibleSingles < artist.singles.length) {
        rows.push({ kind: 'showMore', id: 'more-singles', target: 'singles', remaining: artist.singles.length - visibleSingles })
      }
    }

    return rows
  }, [artist.albums, artist.singles, visibleAlbums, visibleSingles, t])

  const renderItem = useCallback(({ item }: { item: Item }) => {
    if (item.kind === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{item.title}</Text>
        </View>
      )
    }

    if (item.kind === 'showMore') {
      return (
        <TouchableOpacity
          style={styles.showMoreRow}
          onPress={() => item.target === 'albums'
            ? setVisibleAlbums(n => n + 5)
            : setVisibleSingles(n => n + 5)
          }
          activeOpacity={0.65}
        >
          <View style={[styles.showMoreIcon, { backgroundColor: colors.card }]}>
            <Ellipsis size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.showMoreText, { color: colors.secondary }]}>{item.remaining} more</Text>
        </TouchableOpacity>
      )
    }

    return (
      <ExternalAlbumRow
        album={item.album}
        artistName={artist.name}
        onPress={() => navigateToAlbum(item.album)}
      />
    )
  }, [colors, artist.name, navigateToAlbum])

  return (
    <FlashList
      data={items}
      keyExtractor={item => item.id}
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
