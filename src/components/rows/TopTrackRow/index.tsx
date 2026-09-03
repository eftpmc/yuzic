import React, { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Play } from 'lucide-react-native'
import MediaListRow from '@/components/MediaListRow'
import { useTheme } from '@/hooks/useTheme'
import { formatSongDuration } from '@/utils/formatDuration'
import type { ExternalSong } from '@/types'
import Touchable from '@/components/Touchable'
import { typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'

type Props = {
  song: ExternalSong
  index: number
  artistName: string
  onPress?: () => void
}

function TopTrackRow({ song, index, artistName, onPress }: Props) {
  const { colors } = useTheme()
  const rad = useRadius()
  const duration = formatSongDuration(song.duration)

  return (
    <MediaListRow
      title={song.title}
      subtitle={[artistName, duration].filter(Boolean).join(' • ')}
      cover={song.cover}
      onPress={onPress}
      variant="compact"
      leading={
        <Text style={[styles.trackIndex, { color: colors.subtext }]}>
          {index + 1}
        </Text>
      }
      trailing={
        song.previewUrl ? (
          <Touchable
            style={[styles.previewButton, { backgroundColor: colors.card, borderRadius: rad.pill }]}
            onPress={onPress}
            disabled={!onPress}
            hitSlop={8}
          >
            <Play size={13} color={colors.secondary} fill={colors.secondary} />
          </Touchable>
        ) : undefined
      }
    />
  )
}

export default memo(TopTrackRow)

const styles = StyleSheet.create({
  trackIndex: {
    ...typography.caption,
    width: 16,
    textAlign: 'left',
  },
  previewButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
