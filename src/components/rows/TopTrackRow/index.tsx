import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Play } from 'lucide-react-native'
import { MediaImage } from '@/components/MediaImage'
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
    <TouchableOpacity
      style={styles.trackRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <Text style={[styles.trackIndex, { color: colors.subtext }]}>
        {index + 1}
      </Text>
      <MediaImage cover={song.cover} size="thumb" style={styles.trackCover} />
      <View style={styles.trackText}>
        <Text style={[styles.trackTitle, { color: colors.secondary }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[styles.trackSubtitle, { color: colors.subtext }]} numberOfLines={1}>
          {[artistName, duration].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {song.previewUrl ? (
        <View style={[styles.previewButton, { backgroundColor: colors.card }]}>
          <Play size={13} color={colors.secondary} fill={colors.secondary} />
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  trackIndex: {
    width: 16,
    fontSize: 13,
    textAlign: 'left',
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  trackText: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  trackSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  previewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
