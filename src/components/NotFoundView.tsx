import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/hooks/useTheme'

type Props = {
  message?: string
}

export default function NotFoundView({ message = 'Not found' }: Props) {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()

  const bg = isDarkMode ? '#000' : '#fff'
  const iconColor = isDarkMode ? '#fff' : '#1C1C1E'
  const borderColor = isDarkMode ? '#1C1C1E' : '#D1D1D6'

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: bg }]}>
      {/* Back button row matching other screens */}
      <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      {/* Centered error state */}
      <View style={styles.body}>
        <Text style={[styles.message, { color: isDarkMode ? '#e6e6e6' : '#1C1C1E' }]}>{message}</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: 6,
  },
  headerSpacer: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
  },
})
