import React, { forwardRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import { renderBackdrop } from '@/components/BottomSheetBackdrop'
import type { SourceResolvedAlbum, SourceResolvedArtist } from '@/features/sources/registry'

export type PickerItemAlbum = SourceResolvedAlbum & { kind: 'album' }
export type PickerItemArtist = SourceResolvedArtist & { kind: 'artist' }
export type PickerItem = PickerItemAlbum | PickerItemArtist

type Props = {
  items: PickerItem[]
  isLoading?: boolean
  onSelect: (item: PickerItem) => void
  title?: string
}

const SOURCE_COLORS: Record<string, string> = {
  deezer: '#A238CA',
}

const ExternalSourcePickerSheet = forwardRef<BottomSheetModal, Props>(
  ({ items, isLoading, onSelect, title = 'Choose Source' }, ref) => {
    const { isDarkMode } = useTheme()
    const themeStyles = isDarkMode ? stylesDark : stylesLight

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['40%', '70%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
        backgroundStyle={[styles.sheet, themeStyles.sheet]}
        stackBehavior="push"
      >
        <BottomSheetScrollView style={themeStyles.sheet} contentContainerStyle={styles.content}>
          <Text style={[styles.title, themeStyles.title]}>{title}</Text>

          {isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
            </View>
          )}

          {!isLoading && items.length === 0 && (
            <Text style={[styles.empty, themeStyles.empty]}>No sources resolved this item.</Text>
          )}

          {!isLoading && items.map((item, i) => {
            const label = item.kind === 'album' ? item.title : item.name
            const sublabel = item.kind === 'album' ? item.artist : undefined
            const color = SOURCE_COLORS[item.source] ?? '#888'
            return (
              <TouchableOpacity
                key={`${item.source}-${i}`}
                style={[styles.row, themeStyles.row]}
                onPress={() => onSelect(item)}
              >
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeLetter}>{item.source[0].toUpperCase()}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, themeStyles.title]} numberOfLines={1}>{label}</Text>
                  {sublabel ? (
                    <Text style={[styles.rowSublabel, themeStyles.empty]} numberOfLines={1}>{sublabel}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    )
  }
)

ExternalSourcePickerSheet.displayName = 'ExternalSourcePickerSheet'

export default ExternalSourcePickerSheet

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
})

const stylesLight = StyleSheet.create({
  sheet: { backgroundColor: '#F2F2F7' },
  title: { color: '#000' },
  empty: { color: '#888' },
  row: { backgroundColor: 'transparent' },
})

const stylesDark = StyleSheet.create({
  sheet: { backgroundColor: '#222' },
  title: { color: '#fff' },
  empty: { color: '#777' },
  row: { backgroundColor: 'transparent' },
})
