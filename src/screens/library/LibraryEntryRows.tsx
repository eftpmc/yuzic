import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Disc3,
  Download,
  ListMusic,
  Music2,
  Tags,
  Users,
} from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { radius, spacing, typography } from '@/constants/design'
import { useLibraryCounts } from './useLibraryCounts'
import type { LibraryCollectionType } from './librarySort'

type Entry = {
  key: keyof ReturnType<typeof useLibraryCounts>
  labelKey: string
  icon: React.ReactNode
  onPress: () => void
}

/**
 * The library's browse entry points.
 *
 * Every entity type gets one, including genres, which previously had no way in
 * at all. Each opens a screen of its own rather than filtering this list, so
 * the set can grow without the row of filters growing with it.
 */
const LibraryEntryRows: React.FC = () => {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const counts = useLibraryCounts()

  const openCollection = (type: LibraryCollectionType) =>
    navigation.push('libraryCollectionView', { type })

  const size = 19
  const color = colors.secondary

  const entries: Entry[] = [
    {
      key: 'playlists',
      labelKey: 'home.filters.playlists',
      icon: <ListMusic size={size} color={color} />,
      onPress: () => openCollection('playlists'),
    },
    {
      key: 'albums',
      labelKey: 'home.filters.albums',
      icon: <Disc3 size={size} color={color} />,
      onPress: () => openCollection('albums'),
    },
    {
      key: 'artists',
      labelKey: 'home.filters.artists',
      icon: <Users size={size} color={color} />,
      onPress: () => openCollection('artists'),
    },
    {
      key: 'tracks',
      labelKey: 'home.filters.tracks',
      icon: <Music2 size={size} color={color} />,
      onPress: () => openCollection('tracks'),
    },
    {
      key: 'genres',
      labelKey: 'library.genres.title',
      icon: <Tags size={size} color={color} />,
      onPress: () => navigation.push('genresView'),
    },
    {
      key: 'downloaded',
      labelKey: 'home.filters.downloaded',
      icon: <Download size={size} color={color} />,
      onPress: () => openCollection('downloaded'),
    },
  ]

  return (
    <View>
      {entries.map(entry => (
        <TouchableOpacity
          key={entry.key}
          testID={`library-entry-${entry.key}`}
          accessibilityRole="button"
          accessibilityLabel={t(entry.labelKey)}
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={entry.onPress}
        >
          <View style={styles.left}>
            <View style={[styles.iconWell, { backgroundColor: colors.muted }]}>
              {entry.icon}
            </View>
            <Text style={[styles.label, { color: colors.secondary }]} numberOfLines={1}>
              {t(entry.labelKey)}
            </Text>
          </View>
          <View style={styles.right}>
            {counts[entry.key] > 0 && (
              <Text style={[styles.count, { color: colors.subtext }]}>
                {counts[entry.key]}
              </Text>
            )}
            <ChevronRight size={18} color={colors.subtext} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default LibraryEntryRows

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    flex: 1,
    minWidth: 0,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { ...typography.caption },
  label: { ...typography.rowTitle },
})
