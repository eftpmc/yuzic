import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSelector } from 'react-redux'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { useDeezerTopTracksEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors'
import { useArtistTopTracks } from '@/hooks/artists/useArtistTopTracks'
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer'
import TopTrackRow from '@/components/rows/TopTrackRow'
import type { Artist } from '@/types'

type Props = {
  artist: Artist
}

export default function TopTracksSection({ artist }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const enabled = useDeezerTopTracksEnabled()
  const showSourceHeaders = useSelector(selectShowSourceHeaders)
  const { topTracks, biography } = useArtistTopTracks({ name: artist.name, mbid: artist.mbid, enabled })
  const { toggleInAlbum } = usePreviewPlayer()
  const [showAll, setShowAll] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)

  if (!enabled || (topTracks.length === 0 && !biography)) return null

  const allTracks = topTracks.slice(0, 10)
  const visible = showAll ? allTracks : allTracks.slice(0, 5)

  const trackQueue = topTracks
    .filter(s => !!s.previewUrl)
    .map(s => externalSongToTrack(s, s.previewUrl!))

  return (
    <View>
      {!!biography && (
        <TouchableOpacity
          style={styles.bioContainer}
          onPress={() => setBioExpanded(e => !e)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.bioText, { color: colors.subtext }]}
            numberOfLines={bioExpanded ? undefined : 3}
          >
            {biography}
          </Text>
          <Text style={[styles.bioToggle, { color: colors.subtext }]}>
            {bioExpanded ? t('common.less') : t('common.more')}
          </Text>
        </TouchableOpacity>
      )}

      {allTracks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            {showSourceHeaders && (
              <View style={[styles.badge, { backgroundColor: '#A238CA' }]}>
                <Text style={styles.badgeLetter}>D</Text>
              </View>
            )}
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
              {t('artist.sections.topTracks')}
            </Text>
          </View>
          {visible.map((song, index) => (
            <TopTrackRow
              key={song.id}
              song={song}
              index={index}
              artistName={artist.name}
              onPress={song.previewUrl
                ? () => toggleInAlbum(song, song.previewUrl!, trackQueue, artist.id, artist.name)
                : undefined}
            />
          ))}
          {allTracks.length > 5 && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, { backgroundColor: colors.card }]}
                onPress={() => setShowAll(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, { color: colors.secondary }]}>
                  {showAll ? t('common.less') : t('common.more')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bioContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bioToggle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
