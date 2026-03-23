import React, { useEffect, useRef, useState, useMemo } from 'react'
import { StyleSheet, Dimensions, ScrollView, View, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectThemeColor, selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors'
import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useSync } from '@/hooks/useSync'
import { useTranslation } from 'react-i18next'

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
  const { tracks, isLoading: tracksLoading } = useTracks()

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

  const { sync } = useSync()
  const syncOnAppStart = useSelector(selectSyncOnAppStart)

  useEffect(() => {
    if (syncOnAppStart) sync(true)
  }, [activeServer?.id, activeServer?.isAuthenticated, sync, syncOnAppStart])

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

  const counts = useMemo(
    () => ({
      albums: albums.length,
      artists: artists.length,
      playlists: playlists.length,
      tracks: tracks.length,
    }),
    [albums, artists, playlists, tracks]
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
