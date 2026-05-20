import React, { useCallback, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, RefreshControl } from 'react-native'
import { useSelector } from 'react-redux'
import { useTheme } from '@/hooks/useTheme'
import { useDailyLayout } from '@/features/home/hooks/useDailyLayout'
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'

import QuickPicksSection from './components/QuickPicksSection'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import FavoriteAlbums from './components/FavoriteAlbums'
import RandomAlbums from './components/RandomAlbums'
import MostPlayedAlbums from './components/MostPlayedAlbums'
import BecauseYouListenedSection from './components/BecauseYouListenedSection'
import TopArtistsSection from './components/TopArtistsSection'
import DeezerChartsSection from './components/DeezerChartsSection'
import GenreSection from './components/GenreSection'
import type { SectionConfig } from '@/features/home/hooks/useDailyLayout'

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

export default function Home() {
  const { colors } = useTheme()
  const [refreshKey, setRefreshKey] = useState(0)
  const { local, deezer } = useDailyLayout(refreshKey)
  const deezerEnabled = useDeezerDiscoveryEnabled()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => setIsRefreshing(false), 500)
  }, [])

  const activeSources = [
    { id: 'deezer', label: 'Deezer', color: '#A238CA', letter: 'D', sections: deezer, enabled: deezerEnabled },
  ]

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 180 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.secondary}
        />
      }
    >
      <QuickPicksSection refreshKey={refreshKey} />
      {local.map(config => renderSection(config, refreshKey))}

      {activeSources.map(source => {
        if (!source.enabled || source.sections.length === 0) return null
        return (
          <React.Fragment key={source.id}>
            <View style={styles.sourceHeader}>
              {showSourceHeaders && (
                <View style={[styles.sourceBadge, { backgroundColor: source.color }]}>
                  <Text style={styles.sourceBadgeLetter}>{source.letter}</Text>
                </View>
              )}
              <Text style={[styles.sourceHeaderText, { color: colors.subtext }]}>
                {source.label}
              </Text>
            </View>
            {source.sections.map(config => renderSection(config, refreshKey))}
          </React.Fragment>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontWeight: '600',
    color: '#fff',
  },
  sourceHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
