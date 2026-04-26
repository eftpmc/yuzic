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
    <SafeAreaView edges={['top']} style={[styles.screen, isDarkMode && styles.screenDark]}>
      <GenreContent genre={genre} albums={genreAlbums} />
    </SafeAreaView>
  )
}

export default GenreScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#000',
  },
  screenLight: {
    backgroundColor: '#fff',
  },
})
