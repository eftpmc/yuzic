import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
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
import { spacing, typography } from '@/constants/design'
import CoverMosaic from './CoverMosaic'
import { useLibrarySummary, type LibraryEntryKey } from './useLibrarySummary'
import type { LibraryCollectionType } from './librarySort'
import Touchable from '@/components/Touchable'

/** Big enough for four covers to still be covers, and the row's height with it. */
const MOSAIC_SIZE = 56

type Entry = {
  key: LibraryEntryKey
  labelKey: string
  icon: React.ReactNode
  onPress: () => void
}

type Section = {
  key: string
  labelKey: string
  entries: Entry[]
}

/**
 * The library's browse entry points.
 *
 * Two groups, because the rows are two different kinds of thing: the first is
 * what the library *is* — one row per kind of thing in it — and the second is
 * ways of cutting it. A flat list of seven made "Genres" look like a sibling
 * of "Albums" and "Downloaded" look like a sibling of "Tracks", when only one
 * of those pairs is true.
 *
 * Each opens a screen of its own rather than filtering a list here, so the set
 * can grow without a row of filters growing with it — which is how genres went
 * so long with no way in.
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
  const summary = useLibrarySummary()

  const openCollection = (type: LibraryCollectionType) =>
    navigation.push('libraryCollectionView', { type })

  const size = 20
  const color = colors.subtext

  const sections: Section[] = [
    {
      key: 'collection',
      labelKey: 'library.sections.collection',
      entries: [
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
      ],
    },
    {
      key: 'browse',
      labelKey: 'library.sections.browse',
      entries: [
        {
          key: 'genres',
          labelKey: 'library.genres.title',
          icon: <Tags size={size} color={color} />,
          onPress: () => navigation.push('genresView'),
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
        },
      ],
    },
  ]

  return (
    <View>
      {sections.map(section => (
        <View key={section.key}>
          <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
            {t(section.labelKey)}
          </Text>

          {section.entries.map((entry, index) => {
            const { count, covers } = summary[entry.key]
            return (
              <Touchable
                key={entry.key}
                testID={`library-entry-${entry.key}`}
                accessibilityRole="button"
                accessibilityLabel={t(entry.labelKey)}
                style={styles.row}
                onPress={entry.onPress}
              >
                <CoverMosaic covers={covers} fallback={entry.icon} size={MOSAIC_SIZE} />
                {/* The rule starts at the label and stops at the last row of
                    the group, so the art reads as a column rather than a stack
                    of boxed cells. */}
                <View
                  style={[
                    styles.body,
                    index < section.entries.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.labels}>
                    <Text style={[styles.label, { color: colors.secondary }]} numberOfLines={1}>
                      {t(entry.labelKey)}
                    </Text>
                    {count !== undefined && count > 0 && (
                      <Text style={[styles.count, { color: colors.subtext }]} numberOfLines={1}>
                        {t(COUNT_KEY[entry.key], { count })}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.subtext} />
                </View>
              </Touchable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/** "601 albums" rather than a bare 601: the number on its own left the row
 * saying nothing about what it counted. */
const COUNT_KEY: Record<LibraryEntryKey, string> = {
  playlists: 'library.count.playlists',
  albums: 'library.count.albums',
  artists: 'library.count.artists',
  tracks: 'library.count.tracks',
  genres: 'library.count.genres',
  recentlyAdded: 'library.count.albums',
  downloaded: 'library.count.items',
}

export default LibraryEntryRows

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.label,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.roomy,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
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
  labels: { flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  count: { ...typography.caption },
  label: { ...typography.rowTitle },
})
