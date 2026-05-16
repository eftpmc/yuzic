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
  const { isDarkMode } = useTheme()
  const radius = variant === 'artist' ? itemSize / 2 : 6

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
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
              { width: itemSize, height: itemSize, borderRadius: radius },
              isDarkMode && styles.artworkDark,
            ]}
          />
          <View
            style={[
              styles.titleLine,
              { width: itemSize * 0.82 },
              isDarkMode && styles.lineDark,
            ]}
          />
          <View
            style={[
              styles.subtitleLine,
              { width: itemSize * 0.56 },
              isDarkMode && styles.lineDark,
            ]}
          />
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
  artwork: {
    backgroundColor: '#ececf1',
  },
  artworkDark: {
    backgroundColor: '#1d1d22',
  },
  titleLine: {
    height: 13,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: '#e5e5ea',
  },
  subtitleLine: {
    height: 11,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: '#eeeeF2',
  },
  lineDark: {
    backgroundColor: '#2a2a30',
  },
})
