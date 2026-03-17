import React, { useEffect, useRef, useState, useMemo } from 'react'
import { StyleSheet, Dimensions, ScrollView, View, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectOfflineModeEnabled, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'
import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { useFullPlaylists, usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { QueryKeys } from '@/enums/queryKeys'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useDownloadedTracks } from 'react-native-nitro-player'
import {
  getFullyDownloadedAlbumIds,
  isPlaylistFullyDownloaded,
} from '@/utils/downloads/collectionState'

import HomeHeader from './components/Header'
import AccountBottomSheet from './components/AccountBottomSheet'
import LibraryNav from './components/LibraryNav'
import Explore from '@/screens/explore'
import { PageTabBar } from './components/Filters/PageTabBar'

export default function HomeScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()

  const activeServer = useSelector(selectActiveServer)
  const isAuthenticated = activeServer?.isAuthenticated
  const username = activeServer?.username

  const { isDarkMode } = useTheme()
  const { albums, isLoading: albumsLoading } = useAlbums()
  const { artists, isLoading: artistsLoading } = useArtists()
  const { playlists, isLoading: playlistsLoading } = usePlaylists()
  const { playlists: fullPlaylists } = useFullPlaylists(playlists)
  const { tracks, isLoading: tracksLoading } = useTracks()
  const { isTrackDownloaded } = useDownloadedTracks()

  const offlineModeEnabled = useSelector(selectOfflineModeEnabled)
  const themeColor = useSelector(selectThemeColor)
  const isLoading = albumsLoading || artistsLoading || playlistsLoading || tracksLoading

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width)
  const [pagerHeight, setPagerHeight] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const accountSheetRef = useRef<BottomSheetModal>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  const layoutDone = useRef(false)
  const scrollX = useRef(new Animated.Value(0)).current

  const queryClient = useQueryClient()

  useEffect(() => {
    if (!activeServer?.isAuthenticated || !activeServer?.id) return
    const serverId = activeServer.id
    queryClient.refetchQueries({ queryKey: [QueryKeys.Albums, serverId] })
    queryClient.refetchQueries({ queryKey: [QueryKeys.Artists, serverId] })
    queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] })
    queryClient.refetchQueries({ queryKey: [QueryKeys.Tracks, serverId] })
  }, [activeServer?.id, activeServer?.isAuthenticated, queryClient])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (!isAuthenticated) {
      router.replace('/(onboarding)')
    }
  }, [isMounted, isAuthenticated])

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width)
    })
    return () => sub?.remove?.()
  }, [])

  const downloadedTracks = useMemo(
    () => tracks.filter(track => isTrackDownloaded(track.id)),
    [tracks, isTrackDownloaded]
  )
  const downloadedTrackIds = useMemo(
    () => new Set(downloadedTracks.map(t => t.id)),
    [downloadedTracks]
  )
  const downloadedAlbumIds = useMemo(
    () => getFullyDownloadedAlbumIds(tracks, downloadedTrackIds),
    [tracks, downloadedTrackIds]
  )
  const downloadedPlaylistIds = useMemo(
    () =>
      new Set(
        fullPlaylists
          .filter(p => isPlaylistFullyDownloaded(p, downloadedTrackIds))
          .map(p => p.id)
      ),
    [fullPlaylists, downloadedTrackIds]
  )

  const counts = useMemo(
    () => ({
      albums: offlineModeEnabled
        ? albums.filter(a => downloadedAlbumIds.has(a.id)).length
        : albums.length,
      artists: artists.length,
      playlists: offlineModeEnabled
        ? playlists.filter(p => downloadedPlaylistIds.has(p.id)).length
        : playlists.length,
      tracks: offlineModeEnabled ? downloadedTracks.length : tracks.length,
    }),
    [albums, artists, playlists, tracks, offlineModeEnabled, downloadedAlbumIds, downloadedPlaylistIds, downloadedTracks]
  )

  const toggleAccountSheet = () => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
  }

  const handlePagerLayout = () => {
    layoutDone.current = true
  }

  const scrollToPage = (page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * screenWidth, animated: true })
    setCurrentPage(page)
  }

  const handleMomentumScrollEnd = (e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
    setCurrentPage(page)
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <HomeHeader
        title="yuzic"
        username={username}
        onSearch={() => (navigation as any).navigate('search')}
        onAccountPress={toggleAccountSheet}
      />

      <PageTabBar
        scrollX={scrollX}
        screenWidth={screenWidth}
        labels={[t('home.title'), t('library.title')]}
        themeColor={themeColor}
        activeTextColor={isDarkMode ? '#000' : '#fff'}
        inactiveTextColor={isDarkMode ? '#aaa' : '#666'}
        isDarkMode={isDarkMode}
        onPress={scrollToPage}
      />

      <View
        style={styles.pagerContainer}
        onLayout={e => setPagerHeight(e.nativeEvent.layout.height)}
      >
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onLayout={handlePagerLayout}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          style={styles.pager}
        >
          {/* Page 0: Explore (default) */}
          <View style={{ width: screenWidth, height: pagerHeight }}>
            <Explore />
          </View>

          {/* Page 1: Library navigation */}
          <View style={{ width: screenWidth, height: pagerHeight }}>
            <LibraryNav counts={counts} isLoading={isLoading} />
          </View>
        </Animated.ScrollView>
      </View>

      <AccountBottomSheet
        ref={accountSheetRef}
        onDismiss={() => setIsAccountSheetOpen(false)}
      />
    </SafeAreaView>
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
  pagerContainer: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
})
