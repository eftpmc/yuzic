import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import ArtistsForYouSection from './components/ArtistsForYouSection'
import AlbumsForYouSection from './components/AlbumsForYouSection'
import NewAlbumsSection from './components/NewAlbumsSection'
import GenresForYouSection from './components/GenresForYouSection'
import { useExploreArtists } from '@/features/explore/hooks/useExploreArtists'
import { useExploreAlbums } from '@/features/explore/hooks/useExploreAlbums'
import { useExploreNewAlbums } from '@/features/explore/hooks/useExploreNewAlbums'
import { useExploreGenres } from '@/features/explore/hooks/useExploreGenres'

const H_PADDING = 16

function Section({
  title,
  children,
  isDarkMode,
}: {
  title: string
  children: React.ReactNode
  isDarkMode: boolean
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          isDarkMode && styles.sectionTitleDark,
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

export default function Explore() {
  const { isDarkMode } = useTheme()

  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const artists = useExploreArtists(refreshKey)
  const albums = useExploreAlbums(refreshKey)
  const newAlbums = useExploreNewAlbums(refreshKey)
  const genres = useExploreGenres(refreshKey)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshKey(k => k + 1)
    setRefreshing(false)
  }, [])

  return (
    <ScrollView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 150 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDarkMode ? '#fff' : '#000'}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Section title="Artists for You" isDarkMode={isDarkMode}>
        <ArtistsForYouSection
          data={artists.data}
          ready={artists.ready}
        />
      </Section>

      <Section title="Genres You Might Like" isDarkMode={isDarkMode}>
        <GenresForYouSection
          data={genres.data}
          ready={genres.ready}
        />
      </Section>

      <Section title="New Albums to Check Out" isDarkMode={isDarkMode}>
        <NewAlbumsSection
          data={newAlbums.data}
          ready={newAlbums.ready}
        />
      </Section>

      <Section title="Albums You Might Like" isDarkMode={isDarkMode}>
        <AlbumsForYouSection
          data={albums.data}
          ready={albums.ready}
        />
      </Section>
    </ScrollView>
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
  content: {
    paddingTop: 12,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: H_PADDING,
  },
  sectionTitleDark: {
    color: '#fff',
  },
})