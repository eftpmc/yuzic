import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import Touchable from '@/components/Touchable'
import { spacing, typography } from '@/constants/design'

type Props = {
  biography?: string
}

// The biography always comes from an external source (Deezer in local mode,
// the resolved external artist otherwise) — self-hosted servers don't carry
// artist biography text.
export default function BioSection({ biography }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (!biography) return null

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          {t('artist.sections.bio')}
        </Text>
      </View>
      <Touchable
        style={styles.bioContainer}
        onPress={() => setExpanded(e => !e)}
      >
        <Text
          style={[styles.bioText, { color: colors.subtext }]}
          numberOfLines={expanded ? undefined : 3}
        >
          {biography}
        </Text>
        <Text style={[styles.bioToggle, { color: colors.subtext }]}>
          {expanded ? t('common.less') : t('common.more')}
        </Text>
      </Touchable>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.controlGap,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.navigationTitle,
  },
  bioContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bioText: {
    ...typography.rowSubtitle,
  },
  bioToggle: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
})
