import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSelector } from 'react-redux'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { toast } from '@backpackapp-io/react-native-toast'
import { selectSongPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { useTracks } from '@/hooks/tracks'
import { usePlayingActions } from '@/contexts/PlayingContext'
import { usePlayableSongResolver } from '@/hooks/songs'
import TopTrackRow from '@/components/rows/TopTrackRow'
import { rankMostPlayedTracks } from './mostPlayed'
import type { Artist } from '@/types'
import { typography } from '@/constants/design'

type Props = {
  artist: Artist
}

// Your own listening history for this artist — a different claim from
// PopularOnDeezerSection's chart data, so it's a separate, separately-labeled
// section rather than a merged sub-group.
export default function MostPlayedSection({ artist }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { tracks } = useTracks()
  const playCounts = useSelector(selectSongPlayCounts)
  const { playSong } = usePlayingActions()
  const { resolvePlayableSong } = usePlayableSongResolver()

  const ranked = rankMostPlayedTracks(tracks, playCounts, artist.id)
  if (ranked.length === 0) return null

  const tracksById = new Map(tracks.map(t => [t.id, t]))

  const handlePress = async (trackId: string) => {
    try {
      const song = await resolvePlayableSong(trackId);
      if (song) await playSong(song);
    } catch {
      toast.error(t('common.playbackError'));
    }
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          {t('artist.sections.mostPlayed')}
        </Text>
      </View>
      {ranked.map((ranking, index) => {
        const track = tracksById.get(ranking.id);
        if (!track) return null;
        return (
          <TopTrackRow
            key={track.id}
            song={track}
            index={index}
            artistName={artist.name}
            onPress={() => { void handlePress(track.id); }}
          />
        );
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...typography.navigationTitle,
  },
})
