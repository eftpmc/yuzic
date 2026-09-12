import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDivider from '../components/SettingsDivider';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { useTheme } from '@/hooks/useTheme';
import { iconSize, spacing, typography } from '@/constants/design';
import { selectLyricsExternalSourceEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { setLyricsExternalSourceEnabled } from '@/utils/redux/slices/settingsSlice';

/**
 * Lyrics fallback chain.
 *
 * Server-embedded lyrics are drawn as a fixed, non-toggleable first entry —
 * they are what `resolveLyrics` always tries first, and there is no reason
 * to let a user turn off a lookup that costs nothing and asks no external
 * service. Below it: every external source the app knows, off by default,
 * with only LRCLIB available at launch. A single source needs no drag
 * handle to "reorder"; the moment a second source ships, this list grows an
 * actual reorder control rather than the order silently mattering with no
 * way to see or change it.
 */
const LyricsSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();

  const lrclibEnabled = useSelector(selectLyricsExternalSourceEnabled('lrclib'));

  const toggleLrclib = useCallback(
    (enabled: boolean) => {
      dispatch(setLyricsExternalSourceEnabled({ sourceId: 'lrclib', enabled }));
    },
    [dispatch]
  );

  const externalSourceItems = useMemo(
    () => [
      {
        label: t('settings.lyrics.lrclib'),
        subtext: t('settings.lyrics.lrclibSubtext'),
        value: lrclibEnabled,
        onValueChange: toggleLrclib,
      },
    ],
    [t, lrclibEnabled, toggleLrclib]
  );

  return (
    <SettingsScreen title={t('settings.lyrics.title')}>
      <SettingsCardHeader subtle title={t('settings.lyrics.order')} />
      <SettingsCard>
        <View style={styles.pinnedRow} testID="lyrics-server-embedded-row">
          <View style={styles.pinnedLeft}>
            <Check size={iconSize.secondary} color={colors.themeColor} />
            <View style={styles.pinnedText}>
              <Text style={[styles.pinnedLabel, { color: colors.secondary }]}>
                {t('settings.lyrics.serverEmbedded')}
              </Text>
              <Text style={[styles.pinnedSubtext, { color: colors.subtext }]}>
                {t('settings.lyrics.serverEmbeddedSubtext')}
              </Text>
            </View>
          </View>
        </View>
        <SettingsDivider />
        <SettingsToggleGroup items={externalSourceItems} />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default LyricsSettings;

const styles = StyleSheet.create({
  pinnedRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pinnedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedText: {
    marginLeft: spacing.md,
    flexShrink: 1,
  },
  pinnedLabel: {
    ...typography.rowTitle,
  },
  pinnedSubtext: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
});
