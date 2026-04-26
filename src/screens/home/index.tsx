import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors'
import { useTheme } from '@/hooks/useTheme'
import { useSync } from '@/hooks/useSync'

import HomeHeader from './components/Header'
import AccountBottomSheet from './components/AccountBottomSheet'
import Explore from '@/screens/explore'

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const router = useRouter()

  const activeServer = useSelector(selectActiveServer)
  const isAuthenticated = activeServer?.isAuthenticated
  const username = activeServer?.username

  const { isDarkMode } = useTheme()

  const [isMounted, setIsMounted] = useState(false)
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)

  const accountSheetRef = useRef<BottomSheetModal>(null) as unknown as React.RefObject<BottomSheetModal>

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

  const toggleAccountSheet = () => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
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
      <Explore />
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
})
