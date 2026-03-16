import React, { useMemo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useAlbums } from '@/hooks/albums'
import { useStarredSongs } from '@/hooks/starred'
import { selectAlbumLastPlayedAt } from '@/utils/redux/selectors/statsSelectors'
import { selectGridColumns, selectIsGridView } from '@/utils/redux/selectors/settingsSelectors'

import AlbumItem from '@/screens/home/components/Items/AlbumItem'
import LibraryContent from '@/screens/home/components/Content'

type CollectionType = 'recentlyPlayed' | 'recentlyAdded' | 'favoriteAlbums' | 'randomAlbums'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const TITLE_KEYS: Record<CollectionType, string> = {
  recentlyPlayed: 'explore.sections.recentlyPlayed',
  recentlyAdded:  'explore.sections.recentlyAdded',
  favoriteAlbums: 'explore.sections.favoriteAlbums',
  randomAlbums:   'explore.sections.randomAlbums',
}

export default function AlbumCollectionScreen() {
  const { type } = useLocalSearchParams<{ type: CollectionType }>()
  const router = useRouter()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { gridItemWidth, gridSpacing } = useGridLayout()

  const gridColumns = useSelector(selectGridColumns)
  const isGridView = useSelector(selectIsGridView)
  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt)

  const { albums, isLoading } = useAlbums()
  const { songs: starredSongs } = useStarredSongs()

  const data = useMemo(() => {
    switch (type) {
      case 'recentlyPlayed': {
        const entries = Object.entries(albumLastPlayedAt)
          .filter(([, ts]) => ts > 0)
          .sort(([, a], [, b]) => b - a)
        const ordered = entries
          .map(([id]) => albums.find(a => a.id === id))
          .filter(Boolean) as typeof albums
        return ordered.map(a => ({ ...a, type: 'Album' as const }))
      }
      case 'recentlyAdded':
        return [...albums]
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .map(a => ({ ...a, type: 'Album' as const }))
      case 'favoriteAlbums': {
        const starCount = new Map<string, number>()
        for (const song of starredSongs) {
          if (song.albumId) starCount.set(song.albumId, (starCount.get(song.albumId) ?? 0) + 1)
        }
        const favoriteIds = new Set(starCount.keys())
        return [...albums]
          .filter(a => favoriteIds.has(a.id))
          .sort((a, b) => {
            const diff = (starCount.get(b.id) ?? 0) - (starCount.get(a.id) ?? 0)
            return diff !== 0 ? diff : new Date(b.created).getTime() - new Date(a.created).getTime()
          })
          .map(a => ({ ...a, type: 'Album' as const }))
      }
      case 'randomAlbums':
        return shuffle(albums).map(a => ({ ...a, type: 'Album' as const }))
      default:
        return []
    }
  }, [type, albums, albumLastPlayedAt, starredSongs])

  const renderItem = ({ item }: { item: any }) => (
    <AlbumItem
      {...item}
      isGridView={isGridView}
      gridWidth={gridItemWidth}
      gridSpacing={gridSpacing}
    />
  )

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <View style={[styles.header, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.titleWrapper}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            {t(TITLE_KEYS[type] ?? '')}
          </Text>
        </View>

        <View style={styles.backButton} />
      </View>

      <LibraryContent
        data={data}
        isLoading={isLoading}
        isGridView={isGridView}
        gridColumns={gridColumns}
        gridItemWidth={gridItemWidth}
        estimatedItemSize={302}
        renderItem={renderItem}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  titleDark: {
    color: '#fff',
  },
  backButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
