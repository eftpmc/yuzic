import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useAccountSheet } from '@/contexts/AccountSheetContext'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'

import TabHeader from '@/components/TabHeader'
import LibraryEntryRows from '@/screens/library/LibraryEntryRows'
import { spacing } from '@/constants/design'

/**
 * The library index: one entry point per way of browsing the collection.
 *
 * Nothing else. It used to carry a "Recently added" grid under the rows, which
 * duplicated Home's shelf of the same albums and read as a feed pinned to the
 * bottom of a menu. Recency is now one of the rows, so the complete list is
 * still a tap away and this screen stays what it is: a stable, exhaustive index
 * where Home is the changing one.
 *
 * The rows render immediately, mid-sync included — they are the way into every
 * other screen and cost nothing to show.
 */
export default function LibraryScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const activeServer = useSelector(selectActiveServer)
  const username = activeServer?.username
  const { openAccountSheet } = useAccountSheet()

  return (
    <SafeAreaView
      testID="library-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <TabHeader
        title={t('library.title')}
        username={username}
        onAccountPress={openAccountSheet}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LibraryEntryRows />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: spacing.scrollClearance },
})
