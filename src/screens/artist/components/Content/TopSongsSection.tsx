import React, { useCallback } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from '@backpackapp-io/react-native-toast'

import { useApi } from '@/api'
import { QueryKeys } from '@/enums/queryKeys'
import { useTheme } from '@/hooks/useTheme'
import { usePlayingActions } from '@/contexts/PlayingContext'
import { usePlayableSongResolver } from '@/hooks/songs'
import TopTrackRow from '@/components/rows/TopTrackRow'
import { spacing, typography } from '@/constants/design'
import type { Artist } from '@/types'

const TOP_SONG_LIMIT = 5

type Props = {
  artist: Artist
}

/**
 * The server's own ranking of an artist's songs.
 *
 * A third claim about popularity, and deliberately its own section like the
 * two beside it: MostPlayed is what *you* have played, Popular on Deezer is a
 * chart from an external service, and this is what the server says — Subsonic
 * backs `getTopSongs` with Last.fm playcounts, so it is the world's ranking of
 * the records you actually own.
 *
 * It earns its place because the other two can both be empty: MostPlayed shows
 * nothing until you have played something, and Deezer is an outside service
 * that waits to be asked. On a fresh install against a Navidrome server this
 * is the only popularity the artist page can show, and it needs nothing turned
 * on to work.
 */
export default function TopSongsSection({ artist }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const api = useApi()
  const { playSong } = usePlayingActions()
  const { resolvePlayableSong } = usePlayableSongResolver()

  const getTopSongs = api.artists.getTopSongs

  const { data: songs } = useQuery({
    queryKey: [QueryKeys.ServerArtistTopSongs, artist.name],
    // Navidrome only today; the Jellyfin adapter does not implement it, so the
    // section hides itself there rather than showing an empty shelf.
    enabled: Boolean(getTopSongs) && !!artist.name,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => (await getTopSongs?.(artist.name, TOP_SONG_LIMIT)) ?? [],
  })

  const handlePress = useCallback(async (trackId: string) => {
    try {
      const song = await resolvePlayableSong(trackId)
      if (song) await playSong(song)
    } catch {
      toast.error(t('common.playbackError'))
    }
  }, [resolvePlayableSong, playSong, t])

  if (!songs?.length) return null

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          {t('artist.sections.topSongs')}
        </Text>
      </View>
      {songs.map((song, index) => (
        <TopTrackRow
          key={song.id}
          song={song}
          index={index}
          artistName={artist.name}
          onPress={() => void handlePress(song.id)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { ...typography.sectionTitle },
})
