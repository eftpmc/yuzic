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
  source?: 'deezer' | 'musicbrainz' | 'lastfm'
  artistId?: string
  mbid?: string
  name?: string
}

export default function ExternalArtistScreen() {
  const route = useRoute<any>()
  const { source, artistId, mbid, name } = (route.params ?? {}) as RouteParams
  const { isDarkMode } = useTheme()

  const { data: artist, isLoading, error } = useExternalArtist(
    artistId || mbid || name ? { source, artistId, mbid, name: name ?? null } : null
  )

  if (!artistId && !mbid && !name) {
    return <NotFoundView message="Artist not found" />
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, isDarkMode && styles.screenDark]}>
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
    <SafeAreaView edges={['top']} style={[styles.screen, isDarkMode && styles.screenDark]}>
      <ExternalArtistContent artist={artist} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#000',
  },
  screenLight: {
    backgroundColor: '#fff',
  },
})
