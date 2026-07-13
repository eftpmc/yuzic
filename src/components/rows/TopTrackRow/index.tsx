import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Play } from 'lucide-react-native'
import MediaListRow from '@/components/MediaListRow'
import { useTheme } from '@/hooks/useTheme'
import { formatSongDuration } from '@/utils/formatDuration'
import type { ExternalSong } from '@/types'

type Props = {
  song: ExternalSong
  index: number
  artistName: string
  onPress?: () => void
}

export default function TopTrackRow({ song, index, artistName, onPress }: Props) {
  const { colors } = useTheme()
  const duration = formatSongDuration(song.duration)

  return (
    <MediaListRow
      title={song.title}
      subtitle={[artistName, duration].filter(Boolean).join(' • ')}
      cover={song.cover}
      onPress={onPress}
      variant="compact"
      contentStyle={styles.content}
      leading={
        <Text style={[styles.trackIndex, { color: colors.subtext }]}>
          {index + 1}
        </Text>
      }
      trailing={
        song.previewUrl ? (
          <View style={[styles.previewButton, { backgroundColor: colors.card }]}>
            <Play size={13} color={colors.secondary} fill={colors.secondary} />
          </View>
        ) : undefined
      }
    />
  )
}

const styles = StyleSheet.create({
  content: {
    marginRight: 12,
  },
  trackIndex: {
    width: 16,
    fontSize: 13,
    textAlign: 'left',
  },
  previewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
