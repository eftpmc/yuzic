import React from 'react'
import { StyleSheet } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/hooks/useTheme'
import { useLibrary } from '@/contexts/LibraryContext'
import NotFoundView from '@/components/NotFoundView'
import GenreContent from './components/Content'

const GenreScreen: React.FC = () => {
  const route = useRoute<any>()
  const { genre } = route.params
  const { isDarkMode } = useTheme()
  const { albums } = useLibrary()

  const genreAlbums = albums.filter((a) => a.genres.includes(genre))

  if (!genre) {
    return <NotFoundView message="Genre not found" />
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <GenreContent genre={genre} albums={genreAlbums} />
    </SafeAreaView>
  )
}

export default GenreScreen

const styles = StyleSheet.create({
  screen: (isDark: boolean) => ({
    flex: 1,
    backgroundColor: isDark ? '#000' : '#fff',
  }),
})
