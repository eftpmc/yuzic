import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import Touchable from '@/components/Touchable'
import { spacing, typography } from '@/constants/design'

type Props = {
  biography?: string
  /**
   * Set only when `biography` came from `metadata.enrich` rather than the
   * server/Deezer — draws a small unobtrusive source line under the bio
   * ("via Last.fm"), never a persistent per-item badge. Display-only: this
   * has no bearing on whether the bio is shown, only on how it's credited.
   */
  enrichedSourceLabel?: string | null
}

// The biography always comes from an external source (Deezer in local mode,
// the resolved external artist otherwise) — self-hosted servers don't carry
// artist biography text — or, when metadata enrichment is on and neither of
// those has one, from a metadata.enrich source (see `features/metadata`).
export default function BioSection({ biography, enrichedSourceLabel }: Props) {
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
        {enrichedSourceLabel && (
          <Text style={[styles.sourceLine, { color: colors.subtext }]}>
            {t('artist.enrichedBioSource', { source: enrichedSourceLabel })}
          </Text>
        )}
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
  sourceLine: {
    ...typography.micro,
    marginTop: spacing.xxs,
  },
})
