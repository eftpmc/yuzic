import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Disc,
  Download,
  ListMusic,
  Mic2,
  Music2,
  Tag,
} from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { useSheetRef } from '@/utils/useSheetRef'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'
import HomeHeader from '@/screens/library/components/Header'
import AccountBottomSheet from '@/screens/library/components/AccountBottomSheet'

type Route = '/library/playlists' | '/library/albums' | '/library/artists' | '/library/songs' | '/library/genres' | '/library/downloaded'

export default function LibraryMenuScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const activeServer = useSelector(selectActiveServer)
  const username = activeServer?.username

  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const accountSheetRef = useSheetRef()

  const toggleAccountSheet = useCallback(() => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
  }, [accountSheetRef, isAccountSheetOpen])

  const rows: { route: Route; labelKey: string; Icon: typeof Disc }[] = [
    { route: '/library/playlists', labelKey: 'library.categories.playlists', Icon: ListMusic },
    { route: '/library/albums', labelKey: 'library.categories.albums', Icon: Disc },
    { route: '/library/artists', labelKey: 'library.categories.artists', Icon: Mic2 },
    { route: '/library/songs', labelKey: 'library.categories.songs', Icon: Music2 },
    { route: '/library/genres', labelKey: 'library.categories.genres', Icon: Tag },
    { route: '/library/downloaded', labelKey: 'library.categories.downloaded', Icon: Download },
  ]

  return (
    <SafeAreaView
      testID="library-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <HomeHeader
        title="yuzic"
        username={username}
        onSearch={() => router.push('/search')}
        onAccountPress={toggleAccountSheet}
      />

      <View style={styles.list}>
        {rows.map(({ route, labelKey, Icon }) => (
          <TouchableOpacity
            key={route}
            testID={`library-menu-${route.split('/').pop()}`}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => router.push(route as never)}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${themeColor}18` }]}>
              <Icon size={20} color={themeColor} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.secondary }]}>
              {t(labelKey)}
            </Text>
            <ChevronRight size={20} color={colors.subtext} />
          </TouchableOpacity>
        ))}
      </View>

      <AccountBottomSheet
        ref={accountSheetRef}
        onDismiss={() => setIsAccountSheetOpen(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
})
