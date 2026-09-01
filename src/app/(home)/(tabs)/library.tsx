import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useAccountSheet } from '@/contexts/AccountSheetContext'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'

import TabHeader from '@/components/TabHeader'
import LibraryEntryRows from '@/screens/library/LibraryEntryRows'
import LibraryList from '@/screens/library/LibraryList'
import { useLibraryItems } from '@/screens/library/useLibraryItems'
import { useSortLabels } from '@/screens/library/useSortLabels'
import type { SortOrder } from '@/screens/library/librarySort'

/**
 * The library tab is an index: one entry point per entity type, over the mixed
 * recent list that used to be the unfiltered view.
 *
 * The filter pills it replaces could only ever show the types they had room
 * for, which is why genres — the one entity with no pill — had no way in.
 */
export default function LibraryScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const activeServer = useSelector(selectActiveServer)
  const username = activeServer?.username
  const { openAccountSheet } = useAccountSheet()
  const sortLabels = useSortLabels()

  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const items = useLibraryItems(null, sortOrder)

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

      <View style={styles.list}>
        <LibraryList
          items={items}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          sortLabel={sortLabels[sortOrder]}
          header={<LibraryEntryRows />}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },
})
