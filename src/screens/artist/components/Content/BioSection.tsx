import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'

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
      <TouchableOpacity
        style={styles.bioContainer}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
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
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bioToggle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
})
