import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Play, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { useResumableServerQueue } from '@/hooks/useResumableServerQueue';
import { spacing, typography } from '@/constants/design';

/**
 * Shown at the top of Home when the server has a recent queue that this
 * session hasn't started. One tap resumes; the X dismisses for the session.
 *
 * Deliberately a banner, not a modal — a modal on cold start reads as
 * intrusive when the user might just want to browse. This is a suggestion,
 * not a hijack.
 */
export function ResumeQueueBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const { available, resuming, resume, dismiss } = useResumableServerQueue();

  if (!available) return null;

  const from = available.changedBy
    ? t('home.resumeBanner.fromDevice', { device: available.changedBy })
    : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderRadius: rad.card }]}>
      <Touchable
        style={styles.body}
        onPress={() => void resume()}
        disabled={resuming}
        accessibilityLabel={t('home.resumeBanner.resumeLabel')}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.themeColor, borderRadius: rad.pill }]}>
          {resuming
            ? <SpinningLoaderCircle size={16} color="#000" />
            : <Play size={16} color="#000" fill="#000" />
          }
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
            {t('home.resumeBanner.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            {t('home.resumeBanner.subtitle', {
              count: available.songIds.length,
              from,
            })}
          </Text>
        </View>
      </Touchable>
      <Touchable
        onPress={dismiss}
        hitSlop={10}
        style={styles.dismiss}
        accessibilityLabel={t('common.dismiss')}
      >
        <X size={18} color={colors.subtext} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { ...typography.rowTitle },
  subtitle: { ...typography.caption, marginTop: spacing.xxs },
  dismiss: { padding: spacing.sm },
});
