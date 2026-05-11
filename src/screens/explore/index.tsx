import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { useSimilarContent } from '@/features/explore/hooks/useSimilarContent'
import { useDailyLayout } from '@/features/explore/hooks/useDailyLayout'
import { QueryKeys } from '@/enums/queryKeys'
import RecentSongsSpeedDial from './components/RecentSongsSpeedDial'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import FavoriteAlbums from './components/FavoriteAlbums'
import RandomAlbums from './components/RandomAlbums'
import NewReleasesSection from './components/NewReleasesSection'
import BecauseYouListenedSection from './components/BecauseYouListenedSection'
import ArtistsForYouSection from './components/ArtistsForYouSection'
import DeezerChartsSection from './components/DeezerChartsSection'
import GenreSection from './components/GenreSection'
import type { SectionConfig } from '@/features/explore/hooks/useDailyLayout'

function renderSection(config: SectionConfig) {
  switch (config.type) {
    case 'recentlyPlayed':
      return <RecentlyPlayed key={config.key} />
    case 'recentlyAdded':
      return <RecentlyAdded key={config.key} />
    case 'favoriteAlbums':
      return <FavoriteAlbums key={config.key} />
    case 'randomAlbums':
      return <RandomAlbums key={config.key} />
    case 'newReleases':
      return <NewReleasesSection key={config.key} />
    case 'charts':
      return <DeezerChartsSection key={config.key} />
    case 'artistsForYou':
      return <ArtistsForYouSection key={config.key} />
    case 'becauseYouListened':
      return <BecauseYouListenedSection key={config.key} artistName={config.artistName!} />
    case 'genre':
      return <GenreSection key={config.key} genre={config.genre!} />
    default:
      return null
  }
}

export default function Explore() {
  const { isDarkMode } = useTheme()
  const { isFetching, refresh } = useSimilarContent()
  const queryClient = useQueryClient()
  const layout = useDailyLayout()

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refresh()
    queryClient.invalidateQueries({ queryKey: [QueryKeys.ExploreBecauseYouListened] })
    queryClient.invalidateQueries({ queryKey: [QueryKeys.ExploreNewReleases] })
    queryClient.invalidateQueries({ queryKey: [QueryKeys.ExploreDeezerCharts] })
    queryClient.invalidateQueries({ queryKey: [QueryKeys.ExploreGenreRow] })
  }, [refresh, queryClient])

  useEffect(() => {
    if (refreshing && !isFetching) setRefreshing(false)
  }, [refreshing, isFetching])

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
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
      <RecentSongsSpeedDial />
      {layout.map(renderSection)}
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
