import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useSelector } from 'react-redux'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'
import { useTranslation } from 'react-i18next'
import { Disc3, Users, ListMusic, Music2, Clock, Heart, Dices, Download } from 'lucide-react-native'

export type LibraryCounts = {
  albums: number
  artists: number
  playlists: number
  tracks: number
}

type Props = {
  counts: LibraryCounts
  isLoading: boolean
}

type NavItem = {
  key: string
  labelKey: string
  renderIcon: (color: string) => React.ReactNode
  route: '/(home)/categoryList' | '/(home)/albumCollection' | '/(home)/downloadedList'
  param?: string
  countKey?: keyof LibraryCounts
}

const NAV_ITEMS: NavItem[] = [
  { key: 'albums',         labelKey: 'home.filters.albums',             renderIcon: (c) => <Disc3      size={20} color={c} />, route: '/(home)/categoryList',    param: 'albums',          countKey: 'albums' },
  { key: 'artists',        labelKey: 'home.filters.artists',            renderIcon: (c) => <Users      size={20} color={c} />, route: '/(home)/categoryList',    param: 'artists',         countKey: 'artists' },
  { key: 'playlists',      labelKey: 'home.filters.playlists',          renderIcon: (c) => <ListMusic  size={20} color={c} />, route: '/(home)/categoryList',    param: 'playlists',       countKey: 'playlists' },
  { key: 'tracks',         labelKey: 'home.filters.tracks',             renderIcon: (c) => <Music2     size={20} color={c} />, route: '/(home)/categoryList',    param: 'tracks',          countKey: 'tracks' },
  { key: 'downloaded',     labelKey: 'home.filters.downloaded',         renderIcon: (c) => <Download   size={20} color={c} />, route: '/(home)/downloadedList' },
  { key: 'recentlyPlayed', labelKey: 'explore.sections.recentlyPlayed', renderIcon: (c) => <Clock      size={20} color={c} />, route: '/(home)/albumCollection', param: 'recentlyPlayed' },
  { key: 'recentlyAdded',  labelKey: 'explore.sections.recentlyAdded',  renderIcon: (c) => <Clock      size={20} color={c} />, route: '/(home)/albumCollection', param: 'recentlyAdded' },
  { key: 'favoriteAlbums', labelKey: 'explore.sections.favoriteAlbums', renderIcon: (c) => <Heart      size={20} color={c} />, route: '/(home)/albumCollection', param: 'favoriteAlbums' },
  { key: 'randomAlbums',   labelKey: 'explore.sections.randomAlbums',   renderIcon: (c) => <Dices      size={20} color={c} />, route: '/(home)/albumCollection', param: 'randomAlbums' },
]

export default function LibraryNav({ counts, isLoading }: Props) {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const { t } = useTranslation()

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {NAV_ITEMS.map((item, index) => {
        const isLastInGroup =
          index === 4 || index === NAV_ITEMS.length - 1
        const isGroupDivider = index === 4

        return (
          <React.Fragment key={item.key}>
            <TouchableOpacity
              style={[
                styles.row,
                !isLastInGroup && styles.rowBorder,
                !isLastInGroup && (isDarkMode ? styles.rowBorderDark : styles.rowBorderLight),
              ]}
              onPress={() =>
                router.push({
                  pathname: item.route,
                  ...(item.param ? { params: { type: item.param } } : {}),
                })
              }
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: themeColor + '22' }]}>
                {item.renderIcon(themeColor)}
              </View>

              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                {t(item.labelKey)}
              </Text>

              <View style={styles.right}>
                {item.countKey && (
                  isLoading ? (
                    <ActivityIndicator size="small" color={isDarkMode ? '#555' : '#ccc'} />
                  ) : (
                    <Text style={[styles.count, isDarkMode && styles.countDark]}>
                      {counts[item.countKey]}
                    </Text>
                  )
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDarkMode ? '#444' : '#ccc'}
                />
              </View>
            </TouchableOpacity>

            {isGroupDivider && (
              <View style={[styles.groupDivider, isDarkMode ? styles.groupDividerDark : styles.groupDividerLight]} />
            )}
          </React.Fragment>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  content: {
    paddingTop: 8,
    paddingBottom: 150,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBorderLight: {
    borderBottomColor: '#E5E5E5',
  },
  rowBorderDark: {
    borderBottomColor: '#1C1C1E',
  },
  groupDivider: {
    height: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupDividerLight: {
    borderBottomColor: '#E5E5E5',
  },
  groupDividerDark: {
    borderBottomColor: '#1C1C1E',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 15,
    color: '#999',
  },
  countDark: {
    color: '#555',
  },
})
