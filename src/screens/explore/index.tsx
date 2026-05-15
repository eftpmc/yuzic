import React, { useCallback, useRef, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, RefreshControl } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useDailyLayout } from '@/features/explore/hooks/useDailyLayout'
import { usePersistedActiveSource } from '@/features/explore/hooks/usePersistedActiveSource'
import QuickPicksSection from './components/QuickPicksSection'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import FavoriteAlbums from './components/FavoriteAlbums'
import RandomAlbums from './components/RandomAlbums'
import MostPlayedAlbums from './components/MostPlayedAlbums'
import BecauseYouListenedSection from './components/BecauseYouListenedSection'
import ArtistsForYouSection from './components/ArtistsForYouSection'
import TopArtistsSection from './components/TopArtistsSection'
import DeezerChartsSection from './components/DeezerChartsSection'
import GenreSection from './components/GenreSection'
import SourceToggleBar from './components/SourceToggleBar'
import type { SectionConfig } from '@/features/explore/hooks/useDailyLayout'

function renderSection(config: SectionConfig, refreshKey: number) {
  switch (config.type) {
    case 'recentlyPlayed':
      return <RecentlyPlayed key={config.key} />
    case 'recentlyAdded':
      return <RecentlyAdded key={config.key} />
    case 'favoriteAlbums':
      return <FavoriteAlbums key={config.key} />
    case 'randomAlbums':
      return <RandomAlbums key={config.key} refreshKey={refreshKey} />
    case 'mostPlayed':
      return <MostPlayedAlbums key={config.key} />
    case 'charts':
      return <DeezerChartsSection key={config.key} refreshKey={refreshKey} />
    case 'artistsForYou':
      return <ArtistsForYouSection key={config.key} />
    case 'topArtists':
      return <TopArtistsSection key={config.key} refreshKey={refreshKey} />
    case 'becauseYouListened':
      return <BecauseYouListenedSection key={config.key} artistName={config.artistName!} refreshKey={refreshKey} />
    case 'genre':
      return <GenreSection key={config.key} genre={config.genre!} refreshKey={refreshKey} />
    default:
      return null
  }
}

export default function Explore() {
  const { isDarkMode } = useTheme()
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { local, deezer, isOffline } = useDailyLayout(refreshKey)
  const { activeSource, toggle } = usePersistedActiveSource()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshKey(k => k + 1)
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => setRefreshing(false), 600)
  }, [])

  const externalSections =
    activeSource === 'deezer' ? deezer : []

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={[styles.content, { paddingBottom: 180 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDarkMode ? '#fff' : '#000'}
        />
      }
    >
      <QuickPicksSection refreshKey={refreshKey} />
      {local.map(config => renderSection(config, refreshKey))}

      {externalSections.length > 0 && (
        <View style={styles.sourceHeader}>
          <View style={[styles.sourceBadge, { backgroundColor: '#A238CA' }]}>
            <Text style={styles.sourceBadgeLetter}>D</Text>
          </View>
          <Text style={[styles.sourceHeaderText, isDarkMode && styles.sourceHeaderTextDark]}>
            Deezer
          </Text>
        </View>
      )}
      {externalSections.map(config => renderSection(config, refreshKey))}

      <SourceToggleBar
        activeSource={activeSource}
        onToggle={toggle}
        isOffline={isOffline}
      />
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
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sourceBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  sourceHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
  },
  sourceHeaderTextDark: {
    color: '#555',
  },
})
