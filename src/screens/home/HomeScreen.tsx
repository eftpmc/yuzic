import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors'
import { useTheme } from '@/hooks/useTheme'
import { useSync } from '@/hooks/useSync'
import { useIsOffline } from '@/hooks/useIsOffline'
import { useAccountSheet } from '@/contexts/AccountSheetContext'

import TabHeader from '@/components/TabHeader'
import Explore from './Explore'

export default function HomeScreen() {
  const router = useRouter()

  const activeServer = useSelector(selectActiveServer)
  const isAuthenticated = activeServer?.isAuthenticated
  const username = activeServer?.username

  const { colors } = useTheme()
  const { openAccountSheet } = useAccountSheet()

  const [isMounted, setIsMounted] = useState(false)

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

  return (
    <SafeAreaView
      testID="home-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TabHeader
        title="Yuzic"
        username={username}
        onAccountPress={openAccountSheet}
      />
      <Explore />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
