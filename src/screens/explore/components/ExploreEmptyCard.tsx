import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import Loader from '@/components/Loader'

type Props = {
  width: number
  height: number
  radius: number
}

export default function ExploreEmptyCard({
  width,
  height,
  radius,
}: Props) {
  const { isDarkMode } = useTheme()

  return (
    <View
      style={[
        styles.card,
        { width, height, borderRadius: radius },
        isDarkMode && styles.cardDark,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Loader />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#f2f2f7',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
})
