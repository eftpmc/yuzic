import React from 'react'
import { StyleSheet } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExternalArtist } from '@/hooks/artists/useExternalArtist'
import { useTheme } from '@/hooks/useTheme'
import NotFoundView from '@/components/NotFoundView'
import ExternalArtistContent from './components/Content'
import LoadingExternalArtistContent from './components/Content/Loading'

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
    return <NotFoundView message="Artist not found" />
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LoadingExternalArtistContent />
      </SafeAreaView>
    )
  }

  if (error) {
    return <NotFoundView message="Couldn't load artist. Check your connection." />
  }

  if (!artist) {
    return <NotFoundView message="Artist not found" />
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
})
