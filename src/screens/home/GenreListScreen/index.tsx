import React, { useMemo, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useGenres } from '@/hooks/genres/useGenres'
import { useLibrary } from '@/contexts/LibraryContext'
import {
  selectGridColumns,
  selectIsGridView,
} from '@/utils/redux/selectors/settingsSelectors'

import LibraryContent from '@/screens/home/components/Content'
import GridSettingsBottomSheet from '@/screens/home/components/GridSettingsBottomSheet'
import GenreItem from '@/screens/home/components/Items/GenreItem'
import { Grid2x2, List } from 'lucide-react-native'
import { CoverSource } from '@/types'

type GenreEntry = {
  name: string
  albumCount: number
  cover: CoverSource
}

export default function GenreListScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { gridItemWidth, gridSpacing } = useGridLayout()

  const { genres, isLoading } = useGenres()
  const { albums } = useLibrary()

  const gridColumns = useSelector(selectGridColumns)
  const isGridView = useSelector(selectIsGridView)

  const gridSettingsSheetRef = useRef<BottomSheetModal>(null)

  const genreEntries = useMemo<GenreEntry[]>(() => {
    const entries = genres.map((name) => {
      const matched = albums.filter((a) => a.genres.includes(name))
      return {
        name,
        albumCount: matched.length,
        cover: matched[0]?.cover ?? { kind: 'none' as const },
      }
    })
    return entries
      .filter((e) => e.albumCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [genres, albums])

  const iconColor = isDarkMode ? '#fff' : '#000'

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <View style={[styles.header, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
        </TouchableOpacity>
        <View pointerEvents="none" style={styles.titleWrapper}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            {t('home.filters.genres')}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <LibraryContent
        data={genreEntries}
        isLoading={isLoading}
        isGridView={isGridView}
        gridColumns={gridColumns}
        gridItemWidth={gridItemWidth}
        estimatedItemSize={isGridView ? gridItemWidth : 56}
        renderItem={({ item }: { item: GenreEntry }) => (
          <GenreItem
            name={item.name}
            albumCount={item.albumCount}
            cover={item.cover}
            isGridView={isGridView}
            gridWidth={gridItemWidth}
            gridSpacing={gridSpacing}
            onPress={() =>
              router.push({ pathname: '/(home)/genreView', params: { genre: item.name } })
            }
          />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => gridSettingsSheetRef.current?.present()}
            >
              {isGridView ? (
                <List size={20} color={iconColor} />
              ) : (
                <Grid2x2 size={20} color={iconColor} />
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <GridSettingsBottomSheet ref={gridSettingsSheetRef} />
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
  headerButton: {
    padding: 6,
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
  listHeader: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
})
