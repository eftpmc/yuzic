import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExternalArtist } from '@/hooks/artists/useExternalArtist'
import ExternalArtistContent from './components/Content'
import LoadingExternalArtistContent from './components/Content/Loading'
import { useTheme } from '@/hooks/useTheme'

type RouteParams = {
  mbid: string
  name?: string
}

export default function ExternalArtistScreen() {
  const route = useRoute<any>()
  const { mbid, name } = (route.params ?? {}) as RouteParams
  const { isDarkMode } = useTheme()

  const { data: artist, isLoading, error } = useExternalArtist(
    mbid ? { mbid, name: name ?? null } : null
  )

  if (!mbid) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>Artist not found.</Text>
      </SafeAreaView>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LoadingExternalArtistContent />
      </SafeAreaView>
    )
  }

  if (!artist || error) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>
          {error?.message ?? 'Artist not found.'}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <ExternalArtistContent artist={artist} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: (isDark: boolean) => ({
    flex: 1,
    backgroundColor: isDark ? '#000' : '#fff',
  }),
  error: (isDark: boolean) => ({
    color: isDark ? '#fff' : '#000',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  }),
})
