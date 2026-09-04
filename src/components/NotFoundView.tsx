import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/hooks/useTheme'
import Touchable from '@/components/Touchable'
import { spacing, typography } from '@/constants/design'

type Props = {
  message?: string
}

export default function NotFoundView({ message = 'Not found' }: Props) {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Touchable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={24} color={colors.secondary} />
        </Touchable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.message, { color: colors.secondary }]}>{message}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: spacing.tight,
  },
  headerSpacer: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.generous,
    paddingHorizontal: spacing.xxl,
  },
  message: {
    ...typography.rowTitle,
  },
})
