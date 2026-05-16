import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { useSheetRef } from '@/utils/useSheetRef';

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors'
import { useTheme } from '@/hooks/useTheme'
import { useSync } from '@/hooks/useSync'
import { useIsOffline } from '@/hooks/useIsOffline'

import HomeHeader from './components/Header'
import AccountBottomSheet from './components/AccountBottomSheet'
import Explore from '@/screens/home'

export default function HomeScreen() {
  const router = useRouter()

  const activeServer = useSelector(selectActiveServer)
  const isAuthenticated = activeServer?.isAuthenticated
  const username = activeServer?.username

  const { colors } = useTheme()

  const [isMounted, setIsMounted] = useState(false)
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)

  const accountSheetRef = useSheetRef()
  const lastAutoSyncServerIdRef = useRef<string | null>(null)

  const { sync } = useSync()
  const syncOnAppStart = useSelector(selectSyncOnAppStart)
  const isOffline = useIsOffline()
  const isOfflineRef = useRef(isOffline)

  useEffect(() => {
    isOfflineRef.current = isOffline
  }, [isOffline])

  useEffect(() => {
    if (!syncOnAppStart || !activeServer?.id || !activeServer.isAuthenticated) {
      if (!activeServer?.id) lastAutoSyncServerIdRef.current = null
      return
    }
    if (isOfflineRef.current) return

    if (lastAutoSyncServerIdRef.current === activeServer.id) return

    lastAutoSyncServerIdRef.current = activeServer.id
    sync()
  }, [activeServer?.id, activeServer?.isAuthenticated, sync, syncOnAppStart])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (!isAuthenticated) {
      router.replace('/(onboarding)')
    }
  }, [isMounted, isAuthenticated, router])

  const toggleAccountSheet = useCallback(() => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
  }, [accountSheetRef, isAccountSheetOpen])

  return (
    <SafeAreaView
      testID="home-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <HomeHeader
        title="yuzic"
        username={username}
        onSearch={() => router.push('/search')}
        onAccountPress={toggleAccountSheet}
      />
      <Explore />
      <AccountBottomSheet
        ref={accountSheetRef}
        onDismiss={() => setIsAccountSheetOpen(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
