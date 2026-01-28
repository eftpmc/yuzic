import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSelector } from 'react-redux'
import { useTheme } from '@/hooks/useTheme'
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors'

type Props = {
  width: number
  height: number
  radius: number
  /** Show a small loader in the corner (e.g. while loading). */
  loading?: boolean
}

const MESSAGE = 'Come back later'

export default function ExploreEmptyCard({
  width,
  height,
  radius,
  loading = false,
}: Props) {
  const { isDarkMode } = useTheme()
  const themeColor = useSelector(selectThemeColor)

  return (
    <View
      style={[
        styles.card,
        { width, height, borderRadius: radius },
        isDarkMode && styles.cardDark,
      ]}
    >
      {loading && (
        <View style={styles.cornerLoader} pointerEvents="none">
          <ActivityIndicator size="small" color={themeColor} />
        </View>
      )}
      <Text
        style={[styles.message, isDarkMode && styles.messageDark]}
        numberOfLines={1}
      >
        {MESSAGE}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  cornerLoader: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  message: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  messageDark: {
    color: '#aaa',
  },
})
