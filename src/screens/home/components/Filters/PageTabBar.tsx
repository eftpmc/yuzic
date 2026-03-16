import React from 'react'
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native'

type Props = {
  scrollX: Animated.Value
  screenWidth: number
  labels: [string, string]
  themeColor: string
  activeTextColor: string
  inactiveTextColor: string
  isDarkMode: boolean
  onPress: (page: number) => void
}

export function PageTabBar({
  scrollX,
  screenWidth,
  labels,
  themeColor,
  activeTextColor,
  inactiveTextColor,
  isDarkMode,
  onPress,
}: Props) {
  const pill0Opacity = scrollX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const pill1Opacity = scrollX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const text0Color = scrollX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [activeTextColor, inactiveTextColor],
    extrapolate: 'clamp',
  })

  const text1Color = scrollX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [inactiveTextColor, activeTextColor],
    extrapolate: 'clamp',
  })

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {labels.map((label, i) => {
        const fillOpacity = i === 0 ? pill0Opacity : pill1Opacity
        const textColor = i === 0 ? text0Color : text1Color
        return (
          <TouchableOpacity
            key={label}
            style={styles.pill}
            onPress={() => onPress(i)}
            activeOpacity={0.75}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: themeColor, borderRadius: 8, opacity: fillOpacity },
              ]}
            />
            <Animated.Text style={[styles.pillText, { color: textColor }]}>
              {label}
            </Animated.Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  containerDark: {
    borderBottomColor: '#1C1C1E',
  },
  pill: {
    marginHorizontal: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
