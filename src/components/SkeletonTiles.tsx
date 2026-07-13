import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Skeleton } from 'moti/skeleton'
import { useTheme } from '@/hooks/useTheme'
import { radius } from '@/constants/design'

type Props = {
  itemSize: number
  gap: number
  horizontalPadding: number
  variant: 'album' | 'artist'
  count?: number
}

export default function SkeletonTiles({
  itemSize,
  gap,
  horizontalPadding,
  variant,
  count = 4,
}: Props) {
  const { isDarkMode } = useTheme()
  const colorMode = isDarkMode ? 'dark' : 'light'
  const artRadius = variant === 'artist' ? itemSize / 2 : radius.thumb

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`${variant}-skeleton-${index}`}
          style={{ width: itemSize, marginRight: index === count - 1 ? 0 : gap }}
        >
          <Skeleton width={itemSize} height={itemSize} radius={artRadius} colorMode={colorMode} />
          <View style={styles.titleSpacer} />
          <Skeleton width={itemSize * 0.82} height={13} radius={4} colorMode={colorMode} />
          <View style={styles.subtitleSpacer} />
          <Skeleton width={itemSize * 0.56} height={11} radius={4} colorMode={colorMode} />
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 2,
  },
  titleSpacer: {
    height: 8,
  },
  subtitleSpacer: {
    height: 6,
  },
})
