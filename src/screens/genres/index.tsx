import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ChevronRight } from 'lucide-react-native'

import { DetailHeaderBar } from '@/components/DetailHeader'
import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import { buildGenreRows, type GenreRow } from '@/utils/library/genreList'
import LoadingGenreList from './Loading'

const GenresScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { albums, isLoading } = useAlbums()
  const genres = useSelector(selectLibraryGenres)

  const rows = useMemo(() => buildGenreRows(genres, albums), [genres, albums])

  const renderItem = useCallback(({ item }: { item: GenreRow }) => (
    <TouchableOpacity
      testID="genres-item"
      accessibilityRole="button"
      accessibilityLabel={item.genre}
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => navigation.push('genreView', { genre: item.genre })}
    >
      <View style={styles.rowText}>
        <Text style={[styles.genre, { color: colors.secondary }]} numberOfLines={1}>
          {item.genre}
        </Text>
        <Text style={[styles.count, { color: colors.subtext }]}>
          {t('library.genres.albumCount', { count: item.albumCount })}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.subtext} />
    </TouchableOpacity>
  ), [colors, navigation, t])

  return (
    <SafeAreaView
      testID="genres-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar title={t('library.genres.title')} />
      {isLoading && rows.length === 0 ? (
        // Genres are counted from albums, so an unfinished album sync looks
        // exactly like a library with no genres.
        <LoadingGenreList />
      ) : rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtext }]}>
          {t('library.genres.empty')}
        </Text>
      ) : (
        <FlashList<GenreRow>
          data={rows}
          keyExtractor={item => item.genre}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

export default GenresScreen

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: 180 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, minWidth: 0, marginRight: 12 },
  genre: { fontSize: 16, fontWeight: '500' },
  count: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
})
