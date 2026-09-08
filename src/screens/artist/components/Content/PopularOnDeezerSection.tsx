import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSelector } from 'react-redux'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer'
import TopTrackRow from '@/components/rows/TopTrackRow'
import type { ExternalSong } from '@/types'
import Touchable from '@/components/Touchable'
import { controlSize, sourceColor, spacing, typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'

type Props = {
  topTracks: ExternalSong[]
  artistId: string
  artistName: string
}

// Deezer's chart popularity for this artist — a different claim from
// MostPlayedSection's personal listening history, so they're separate,
// separately-labeled sections rather than merged sub-groups.
export default function PopularOnDeezerSection({ topTracks, artistId, artistName }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const rad = useRadius()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const { toggleInAlbum } = usePreviewPlayer()
  const [showAll, setShowAll] = useState(false)

  if (topTracks.length === 0) return null

  const allTracks = topTracks.slice(0, 10)
  const visible = showAll ? allTracks : allTracks.slice(0, 5)

  const trackQueue = topTracks
    .filter(s => !!s.previewUrl)
    .map(s => externalSongToTrack(s, s.previewUrl!))

  return (
    <View>
      <View style={styles.sectionHeader}>
        {showSourceHeaders && (
          <View style={[styles.badge, { backgroundColor: sourceColor.deezer, borderRadius: rad.pill }]}>
            <Text style={styles.badgeLetter}>D</Text>
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          {t('artist.sections.popularOnDeezer')}
        </Text>
      </View>
      {visible.map((song, index) => (
        <TopTrackRow
          key={song.id}
          song={song}
          index={index}
          artistName={artistName}
          onPress={song.previewUrl
            ? () => toggleInAlbum(song, song.previewUrl!, trackQueue, artistId, artistName)
            : undefined}
        />
      ))}
      {allTracks.length > 5 && (
        <View style={styles.toggleRow}>
          <Touchable
            style={[styles.toggleButton, { backgroundColor: colors.card, borderRadius: rad.pillFor(controlSize.inlineControl) }]}
            onPress={() => setShowAll(v => !v)}
          >
            <Text style={[styles.toggleText, { color: colors.secondary }]}>
              {showAll ? t('common.less') : t('common.more')}
            </Text>
          </Touchable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: spacing.lg,
    paddingBottom: spacing.controlGap,
    paddingHorizontal: spacing.lg,
  },
  badge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    ...typography.micro,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    ...typography.navigationTitle,
    paddingHorizontal: 0,
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  toggleButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.rowSubtitle,
    fontWeight: '500',
  },
})
