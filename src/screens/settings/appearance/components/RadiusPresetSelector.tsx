import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography, type RadiusPreset } from '@/constants/design';
import { selectRadiusPreset, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setRadiusPreset } from '@/utils/redux/slices/settingsSlice';
import Touchable from '@/components/Touchable';
import SettingsCard from '../../components/SettingsCard';
import SettingsDivider from '../../components/SettingsDivider';

// The preview swatches are 44×44 boxes with each preset's own corner radius so
// the choice reads visually, not as text. These override radius.card at render
// time (the exported `radius` reflects the CURRENT preset, not each option).
const PREVIEW_RADIUS: Record<RadiusPreset, number> = {
  sharp: 0,
  default: 8,
  rounded: 14,
};

export const RadiusPresetSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const selected = useSelector(selectRadiusPreset);
  const themeColor = useSelector(selectThemeColor);

  const handleSelect = useCallback((preset: RadiusPreset) => {
    if (preset === selected) return;
    dispatch(setRadiusPreset(preset));
  }, [dispatch, selected]);

  const presets: RadiusPreset[] = ['sharp', 'default', 'rounded'];

  return (
    <>
      <Text style={[styles.caption, { color: colors.subtext }]}>
        {t('settings.appearance.radiusPreset.info')}
      </Text>
      <SettingsCard>
        {presets.map((preset, index) => {
          const isActive = selected === preset;
          return (
            <React.Fragment key={preset}>
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => handleSelect(preset)}
                style={styles.row}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      borderRadius: PREVIEW_RADIUS[preset],
                      backgroundColor: isActive ? themeColor : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <View style={styles.rowText}>
                  <Text style={[styles.label, { color: colors.secondary }]}>
                    {t(`settings.appearance.radiusPreset.${preset}.label`)}
                  </Text>
                  <Text style={[styles.subtext, { color: colors.subtext }]}>
                    {t(`settings.appearance.radiusPreset.${preset}.subtext`)}
                  </Text>
                </View>
                {isActive && <Check size={20} color={themeColor} />}
              </Touchable>
              {index < presets.length - 1 && <SettingsDivider />}
            </React.Fragment>
          );
        })}
      </SettingsCard>
    </>
  );
};

const styles = StyleSheet.create({
  caption: {
    ...typography.caption,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: spacing.tight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  swatch: {
    width: 40,
    height: 40,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
  },
  subtext: {
    ...typography.caption,
    marginTop: 2,
  },
});
