import React, { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Play } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import MediaListRow from '@/components/MediaListRow'
import { useTheme } from '@/hooks/useTheme'
import { formatSongDuration } from '@/utils/formatDuration'
import type { ExternalSong } from '@/types'
import Touchable from '@/components/Touchable'
import { iconSize, typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'

/** The preview affordance on an external top-track row, drawn small on purpose
 *  — it sits inside a row rather than beside one. `hitSlopFor` pads it out. */
const PREVIEW_BUTTON_SIZE = 28

type Props = {
  song: ExternalSong
  index: number
  artistName: string
  onPress?: () => void
}

function TopTrackRow({ song, index, artistName, onPress }: Props) {
  const { t } = useTranslation()
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
            accessibilityRole="button"
            accessibilityLabel={t('a11y.topTrack.playPreview', { title: song.title })}
            style={[styles.previewButton, { backgroundColor: colors.card, borderRadius: rad.pillFor(PREVIEW_BUTTON_SIZE) }]}
            onPress={onPress}
            disabled={!onPress}
            hitSlop={8}
          >
            <Play size={iconSize.badge} color={colors.secondary} fill={colors.secondary} />
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
    width: PREVIEW_BUTTON_SIZE,
    height: PREVIEW_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
