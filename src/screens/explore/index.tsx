import React, { useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import FavoriteAlbums from './components/FavoriteAlbums'
import RandomAlbums from './components/RandomAlbums'
import RecentSongsSpeedDial from './components/RecentSongsSpeedDial'
import AlbumsForYouSection from './components/AlbumsForYouSection'
import ArtistsForYouSection from './components/ArtistsForYouSection'
import { useSimilarContent } from '@/features/explore/hooks/useSimilarContent'

export default function Explore() {
  const { isDarkMode } = useTheme()
  const [shuffleKey, setShuffleKey] = useState(() => Date.now())

  const { artists, albums, artistsReady, albumsReady, isFetching } = useSimilarContent(shuffleKey)

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isFetching) setRefreshing(false)
  }, [isFetching])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setShuffleKey(Date.now())
  }, [])

  return (
    <ScrollView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
      contentContainerStyle={[styles.content, { paddingBottom: 180 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDarkMode ? '#888' : '#aaa'}
        />
      }
    >
      <RecentSongsSpeedDial/>
      <RecentlyPlayed />
      <RecentlyAdded />
      <AlbumsForYouSection data={albums} ready={albumsReady} />
      <ArtistsForYouSection data={artists} ready={artistsReady} />
      <FavoriteAlbums />
      <RandomAlbums />
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
})
