import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

type Props = {
  itemSize: number
  gap: number
  horizontalPadding: number
  variant: 'album' | 'artist'
  count?: number
}

export default function LoadingTiles({
  itemSize,
  gap,
  horizontalPadding,
  variant,
  count = 4,
}: Props) {
  const { colors } = useTheme()
  const radius = variant === 'artist' ? itemSize / 2 : 6

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`${variant}-loading-${index}`}
          style={[
            styles.item,
            { width: itemSize, marginRight: index === count - 1 ? 0 : gap },
          ]}
        >
          <View
            style={[
              styles.artwork,
              { width: itemSize, height: itemSize, borderRadius: radius, backgroundColor: colors.muted },
            ]}
          />
          <View style={[styles.titleLine, { width: itemSize * 0.82, backgroundColor: colors.muted }]} />
          <View style={[styles.subtitleLine, { width: itemSize * 0.56, backgroundColor: colors.muted }]} />
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 2,
  },
  item: {
    minWidth: 0,
  },
  artwork: {},
  titleLine: {
    height: 13,
    marginTop: 8,
    borderRadius: 4,
  },
  subtitleLine: {
    height: 11,
    marginTop: 6,
    borderRadius: 4,
  },
})
