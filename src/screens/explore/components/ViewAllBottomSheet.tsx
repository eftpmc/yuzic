import React, { forwardRef, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native'
import {
  BottomSheetModal,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet'
import { ChevronRight } from 'lucide-react-native'
import { MediaImage } from '@/components/MediaImage'
import { useTheme } from '@/hooks/useTheme'
import type { ExternalArtistBase, ExternalAlbumBase } from '@/types'

const ROW_HEIGHT = 64
const THUMB_SIZE = 44

export type ViewAllVariant = 'artists' | 'albums'

export type ViewAllItem = ExternalArtistBase | ExternalAlbumBase


type Props = {
  variant: ViewAllVariant
  items: ViewAllItem[]
  onItemPress: (item: ViewAllItem) => void
  onClose: () => void
  onDismissed?: () => void
}

const ViewAllBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ variant, items, onItemPress, onClose, onDismissed }, ref) => {
    const { isDarkMode, colors } = useTheme()

    const snapPoints = useMemo(() => ['50%', '90%'], [])

    const handlePress = (item: ViewAllItem) => {
      onItemPress(item)
      onClose()
    }

    const renderItem = ({ item }: ListRenderItemInfo<ViewAllItem>) => {
      const isArtistRow = variant === 'artists'
      const titleText = isArtistRow
        ? (item as ExternalArtistBase).name
        : (item as ExternalAlbumBase).title
      const subText = isArtistRow
        ? (item as ExternalArtistBase).subtext
        : (item as ExternalAlbumBase).subtext ||
          (item as ExternalAlbumBase).artist

      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => handlePress(item)}
          activeOpacity={0.6}
        >
          <MediaImage
            cover={item.cover}
            size="thumb"
            style={[
              styles.thumb,
              {
                borderRadius: isArtistRow ? THUMB_SIZE / 2 : 6,
              },
            ]}
          />
          <View style={styles.textWrap}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {titleText}
            </Text>
            {subText ? (
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: colors.subtext }]}
              >
                {subText}
              </Text>
            ) : null}
          </View>
          <ChevronRight
            size={20}
            color={colors.subtext}
            style={styles.chevron}
          />
        </TouchableOpacity>
      )
    }

    const ItemSeparator = () => (
      <View
        style={[
          styles.separator,
          { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' },
        ]}
      />
    )

    const keyExtractor = (item: ViewAllItem) => item.id

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        onDismiss={onDismissed}
      >
        <BottomSheetFlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={styles.listContent}
        />
      </BottomSheetModal>
    )
  }
)

ViewAllBottomSheet.displayName = 'ViewAllBottomSheet'

export default ViewAllBottomSheet

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingVertical: 10,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    overflow: 'hidden',
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: THUMB_SIZE + 12,
  },
})
