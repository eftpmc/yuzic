import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, RefreshControl } from 'react-native'
import { useIsFetching } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { useDailyLayout } from '@/features/home/hooks/useDailyLayout'
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'

import QuickPicksSection from './components/QuickPicksSection'
import RecentlyPlayed from './components/RecentlyPlayed'
import RecentlyAdded from './components/RecentlyAdded'
import MostPlayedAlbums from './components/MostPlayedAlbums'
import BecauseYouListenedSection from './components/BecauseYouListenedSection'
import TopArtistsSection from './components/TopArtistsSection'
import DeezerChartsSection from './components/DeezerChartsSection'
import GenreSection from './components/GenreSection'
import ServerRandomSection from './components/ServerRandomSection'
import ServerNowPlayingSection from './components/ServerNowPlayingSection'
import LBSimilarForYouSection from './components/LBSimilarForYouSection'
import ContinuePlayingSection from './components/ContinuePlayingSection'
import { ResumeQueueBanner } from './components/ResumeQueueBanner'
import { useApi } from '@/api'
import type { SectionConfig } from '@/features/home/hooks/useDailyLayout'
import { sourceColor, spacing, typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'

function renderSection(config: SectionConfig, refreshKey: number) {
  switch (config.type) {
    case 'quickPicks':
      return <QuickPicksSection key={config.key} refreshKey={refreshKey} />
    case 'recentlyPlayed':
      return <RecentlyPlayed key={config.key} />
    case 'continuePlaying':
      return <ContinuePlayingSection key={config.key} />
    case 'recentlyAdded':
      return <RecentlyAdded key={config.key} />
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
    case 'serverRandom':
      return <ServerRandomSection key={config.key} refreshKey={refreshKey} />
    case 'serverNowPlaying':
      return <ServerNowPlayingSection key={config.key} />
    case 'lbSimilarArtistsForYou':
      return <LBSimilarForYouSection key={config.key} artistName={config.artistName!} refreshKey={refreshKey} />
    default:
      return null
  }
}

export default function Home() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const rad = useRadius()
  const [refreshKey, setRefreshKey] = useState(0)
  const { resume, library, server, listenbrainz, deezer } = useDailyLayout(refreshKey)
  const deezerEnabled = useDeezerDiscoveryEnabled()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const api = useApi()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Track active query count so the spinner clears when fetches complete rather
  // than after a fixed 500ms timeout.
  const isFetching = useIsFetching()
  const refreshStateRef = useRef({ fetchStarted: false, timer: null as ReturnType<typeof setTimeout> | null })

  const clearRefreshing = useCallback(() => {
    const s = refreshStateRef.current
    if (s.timer) { clearTimeout(s.timer); s.timer = null }
    s.fetchStarted = false
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    if (!isRefreshing) return
    const s = refreshStateRef.current
    if (isFetching > 0) {
      // At least one fetch has started — cancel the safety timer and wait for 0.
      s.fetchStarted = true
      if (s.timer) { clearTimeout(s.timer); s.timer = null }
    } else if (s.fetchStarted) {
      // All fetches done — spinner can go away.
      clearRefreshing()
    }
  }, [isRefreshing, isFetching, clearRefreshing])

  const onRefresh = useCallback(() => {
    const s = refreshStateRef.current
    s.fetchStarted = false
    if (s.timer) clearTimeout(s.timer)
    // Safety: if all data is already within staleTime, isFetching never rises.
    // Cap the spinner at 2s so it doesn't spin forever.
    s.timer = setTimeout(clearRefreshing, 2000)
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
  }, [clearRefreshing])

  // Server discovery is on whenever the adapter provides it — no per-user
  // toggle, matching how radio and shares appear only where the server can
  // back them. ListenBrainz too: MBID-keyed and free.
  const activeSources = [
    {
      id: 'server',
      label: t('explore.sources.server', 'On your server'),
      color: sourceColor.listenbrainz, // fallback source color; server has no brand hex
      letter: 'S',
      sections: server,
      enabled: Boolean(api.discovery),
    },
    {
      id: 'listenbrainz',
      label: 'ListenBrainz',
      color: sourceColor.listenbrainz,
      letter: 'B',
      sections: listenbrainz,
      enabled: true,
    },
    { id: 'deezer', label: 'Deezer', color: sourceColor.deezer, letter: 'D', sections: deezer, enabled: deezerEnabled },
  ]

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.scrollClearance }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.secondary}
        />
      }
    >
      <ResumeQueueBanner />

      {resume.map(config => renderSection(config, refreshKey))}

      {library.length > 0 && (
        <>
          <View style={styles.sourceHeader}>
            <Text style={[styles.sourceHeaderText, { color: colors.subtext }]}>
              {t('explore.sections.fromYourLibrary')}
            </Text>
          </View>
          {library.map(config => renderSection(config, refreshKey))}
        </>
      )}

      {activeSources.map(source => {
        if (!source.enabled || source.sections.length === 0) return null
        return (
          <React.Fragment key={source.id}>
            <View style={styles.sourceHeader}>
              {showSourceHeaders && (
                <View style={[styles.sourceBadge, { backgroundColor: source.color, borderRadius: rad.pill }]}>
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
    paddingTop: spacing.md,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.roomy,
    paddingBottom: spacing.xs,
  },
  sourceBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    ...typography.micro,
    fontWeight: '600',
    color: '#fff',
  },
  sourceHeaderText: {
    ...typography.label,
  },
})
