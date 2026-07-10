import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import { LIST_PADDING } from '@/screens/library/components/CategoryListScreen'

const GRID_GAP = 8
const COLUMNS = 2

type GenreTile = { name: string; count: number }

export default function GenresScreen() {
  const router = useRouter()
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { albums } = useAlbums()
  const libraryGenres = useSelector(selectLibraryGenres)
  const { width: screenWidth } = useWindowDimensions()

  const tileWidth = (screenWidth - LIST_PADDING * 2 - (COLUMNS + 1) * GRID_GAP) / COLUMNS

  // Same source-of-truth as GenreSection on Home: the synced server genre list,
  // topped up with a scan of album tags since not every server backend populates it fully.
  const genres = useMemo<GenreTile[]>(() => {
    const counts = new Map<string, number>()
    libraryGenres.forEach(g => {
      const trimmed = g.trim()
      if (trimmed && !counts.has(trimmed)) counts.set(trimmed, 0)
    })
    const scanLimit = Math.min(albums.length, 500)
    for (let i = 0; i < scanLimit; i++) {
      albums[i].genres?.forEach(g => {
        const trimmed = g.trim()
        if (!trimmed) return
        counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
      })
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [libraryGenres, albums])

  const handleSelectGenre = useCallback((genre: string) => {
    navigation.navigate('genreView', { genre })
  }, [navigation])

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
          {t('library.categories.genres')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlashList<GenreTile>
        data={genres}
        keyExtractor={item => item.name}
        numColumns={COLUMNS}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.tile,
              { width: tileWidth, marginHorizontal: GRID_GAP, marginVertical: GRID_GAP / 2, backgroundColor: colors.muted },
            ]}
            onPress={() => handleSelectGenre(item.name)}
          >
            <Text style={[styles.tileName, { color: colors.secondary }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.tileCount, { color: colors.subtext }]}>
              {t('library.genres.albumCount', { count: item.count })}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subtext }]}>{t('library.genres.empty')}</Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  list: {
    paddingHorizontal: LIST_PADDING,
    paddingVertical: 8,
    paddingBottom: 180,
  },
  tile: {
    borderRadius: 12,
    padding: 14,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  tileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tileCount: {
    fontSize: 13,
    marginTop: 8,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
})
