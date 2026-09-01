import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import SkeletonTile from './SkeletonTile'

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
          style={{ marginRight: index === count - 1 ? 0 : gap }}
        >
          <SkeletonTile size={itemSize} variant={variant} colorMode={colorMode} />
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 2,
  },
})
