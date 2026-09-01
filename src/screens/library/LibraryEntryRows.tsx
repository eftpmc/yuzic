import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Clock3,
  Disc3,
  Download,
  ListMusic,
  Music2,
  Tags,
  Users,
} from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { controlSize, radius, spacing, typography } from '@/constants/design'
import { useLibraryCounts } from './useLibraryCounts'
import type { LibraryCollectionType } from './librarySort'

type Entry = {
  key: string
  labelKey: string
  icon: React.ReactNode
  onPress: () => void
  /** Omitted where a number would only repeat a row above: "Recently added"
   * holds the same albums as "Albums", so counting them says nothing. */
  count?: number
}

/**
 * The library's browse entry points.
 *
 * Entity types first, then the views over them. Each opens a screen of its own
 * rather than filtering a list here, so the set can grow without a row of
 * filters growing with it — which is how genres went so long with no way in.
 *
 * "Recently added" is a row rather than the grid it used to be. The grid
 * duplicated Home's own recently-added shelf, which is the better place for it:
 * a short, changing view belongs on the screen you open first. The row gives
 * the Library tab what Home can't — the complete list, sorted and browsable
 * like any other collection here.
 */
const LibraryEntryRows: React.FC = () => {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const counts = useLibraryCounts()

  const openCollection = (type: LibraryCollectionType) =>
    navigation.push('libraryCollectionView', { type })

  const size = 20
  const color = colors.secondary

  const entries: Entry[] = [
    {
      key: 'playlists',
      labelKey: 'home.filters.playlists',
      icon: <ListMusic size={size} color={color} />,
      onPress: () => openCollection('playlists'),
      count: counts.playlists,
    },
    {
      key: 'albums',
      labelKey: 'home.filters.albums',
      icon: <Disc3 size={size} color={color} />,
      onPress: () => openCollection('albums'),
      count: counts.albums,
    },
    {
      key: 'artists',
      labelKey: 'home.filters.artists',
      icon: <Users size={size} color={color} />,
      onPress: () => openCollection('artists'),
      count: counts.artists,
    },
    {
      key: 'tracks',
      labelKey: 'home.filters.tracks',
      icon: <Music2 size={size} color={color} />,
      onPress: () => openCollection('tracks'),
      count: counts.tracks,
    },
    {
      key: 'genres',
      labelKey: 'library.genres.title',
      icon: <Tags size={size} color={color} />,
      onPress: () => navigation.push('genresView'),
      count: counts.genres,
    },
    {
      key: 'recentlyAdded',
      labelKey: 'library.recentlyAdded',
      icon: <Clock3 size={size} color={color} />,
      onPress: () => openCollection('recentlyAdded'),
    },
    {
      key: 'downloaded',
      labelKey: 'home.filters.downloaded',
      icon: <Download size={size} color={color} />,
      onPress: () => openCollection('downloaded'),
      count: counts.downloaded,
    },
  ]

  return (
    <View>
      {entries.map((entry, index) => (
        <TouchableOpacity
          key={entry.key}
          testID={`library-entry-${entry.key}`}
          accessibilityRole="button"
          accessibilityLabel={t(entry.labelKey)}
          style={styles.row}
          onPress={entry.onPress}
        >
          <View style={[styles.iconWell, { backgroundColor: colors.muted }]}>
            {entry.icon}
          </View>
          {/* The rule starts at the label and stops at the last row, so the
              icons read as a column rather than a stack of boxed cells. */}
          <View
            style={[
              styles.body,
              index < entries.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.secondary }]} numberOfLines={1}>
              {t(entry.labelKey)}
            </Text>
            <View style={styles.right}>
              {entry.count !== undefined && entry.count > 0 && (
                <Text style={[styles.count, { color: colors.subtext }]}>
                  {entry.count}
                </Text>
              )}
              <ChevronRight size={18} color={colors.subtext} />
            </View>
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
    gap: spacing.lg,
    paddingHorizontal: spacing.page,
  },
  body: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  iconWell: {
    width: controlSize.iconCompact,
    height: controlSize.iconCompact,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { ...typography.caption },
  label: { ...typography.rowTitle, flexShrink: 1 },
})
