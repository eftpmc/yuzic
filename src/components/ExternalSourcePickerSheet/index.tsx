import React, { forwardRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { renderBackdrop } from '@/components/BottomSheetBackdrop'
import { getSourceMeta } from '@/features/sources/registry'
import { MediaImage } from '@/components/MediaImage'
import type { SourceResolvedAlbum, SourceResolvedArtist } from '@/features/sources/registry'
import {
  OptionSheetDivider,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from '@/components/options/OptionSheetPrimitives'

export type PickerItemAlbum = SourceResolvedAlbum & { kind: 'album' }
export type PickerItemArtist = SourceResolvedArtist & { kind: 'artist' }
export type PickerItem = PickerItemAlbum | PickerItemArtist

type Props = {
  items: PickerItem[]
  isLoading?: boolean
  onSelect: (item: PickerItem) => void
}

const COVER_SIZE = 48

const ExternalSourcePickerSheet = forwardRef<BottomSheetModal, Props>(
  ({ items, isLoading, onSelect }, ref) => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const sheetBg = useOptionSheetBackground()

    const grouped = items.reduce<Record<string, PickerItem[]>>((acc, item) => {
      if (!acc[item.source]) acc[item.source] = []
      acc[item.source].push(item)
      return acc
    }, {})

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
        stackBehavior="push"
      >
        <BottomSheetScrollView style={sheetBg} contentContainerStyle={optionSheetStyles.sheetContent}>
          {isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.subtext} />
            </View>
          )}

          {!isLoading && items.length === 0 && (
            <Text style={[styles.empty, { color: colors.subtext }]}>
              {t('externalSourcePicker.empty')}
            </Text>
          )}

          {!isLoading && Object.entries(grouped).map(([sourceId, sourceItems], groupIndex) => {
            const meta = getSourceMeta(sourceId)
            const sourceLabel = meta?.label ?? sourceId
            return (
              <View key={sourceId}>
                {groupIndex > 0 && <OptionSheetDivider />}
                <OptionSheetSectionLabel label={sourceLabel} />
                {sourceItems.map((item, i) => {
                  const label = item.kind === 'album' ? item.title : item.name
                  const sublabel = item.kind === 'album' ? (item as SourceResolvedAlbum).artist : undefined
                  const isArtist = item.kind === 'artist'
                  return (
                    <TouchableOpacity
                      key={`${item.source}-${i}`}
                      style={styles.option}
                      onPress={() => onSelect(item)}
                      activeOpacity={0.7}
                    >
                      <MediaImage
                        cover={item.coverUrl ? { kind: 'url', url: item.coverUrl } : { kind: 'letter', name: label }}
                        size="thumb"
                        style={[styles.cover, { borderRadius: isArtist ? COVER_SIZE / 2 : 6 }]}
                      />
                      <View style={styles.optionText}>
                        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
                          {label}
                        </Text>
                        {sublabel && (
                          <Text style={[styles.artist, { color: colors.subtext }]} numberOfLines={1}>
                            {sublabel}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
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
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
})
