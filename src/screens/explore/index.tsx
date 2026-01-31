import React from 'react'
import {
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import FavoriteAlbums from './components/FavoriteAlbums'
import RandomAlbums from './components/RandomAlbums'

export default function Explore() {
  const { isDarkMode } = useTheme()

  return (
    <ScrollView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
      contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
      showsVerticalScrollIndicator={false}
    >
      <RecentlyPlayed />
      <RecentlyAdded />
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