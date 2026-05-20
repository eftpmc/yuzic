import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExternalArtist } from '@/hooks/artists/useExternalArtist'
import { useTheme } from '@/hooks/useTheme'
import { useArtistLibraryMatch } from '@/hooks/useLibraryMatch'
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
  const navigation = useNavigation<any>()
  const { source, artistId, mbid, name } = (route.params ?? {}) as RouteParams
  const { colors } = useTheme()

  const localId = useArtistLibraryMatch(
    name ? { id: artistId ?? '', name, cover: { kind: 'none' }, subtext: '', externalIds: { mbid } } : null
  )

  const { data: artist, isLoading, error } = useExternalArtist(
    artistId || mbid || name ? { source, artistId, mbid, name: name ?? null } : null
  )

  if (!artistId && !mbid && !name) {
    return <NotFoundView message="Artist not found" />
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
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
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      {localId && (
        <TouchableOpacity
          style={[styles.libraryBanner, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('artistView', { id: localId })}
          activeOpacity={0.75}
        >
          <Text style={[styles.bannerText, { color: colors.secondary }]}>
            This artist is in your library — tap to open
          </Text>
        </TouchableOpacity>
      )}
      <ExternalArtistContent artist={artist} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  libraryBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
})
