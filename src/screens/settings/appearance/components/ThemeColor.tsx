import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setThemeColor } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from '../../components/SettingsCard';
import { THEME_PRESET_COLORS } from '@/constants/settings';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export const ThemeColor: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const rad = useRadius();

  return (
    <>
      <Text style={[styles.caption, { color: colors.subtext }]}>
        {t('settings.appearance.color.info')}
      </Text>
      <SettingsCard style={styles.card}>
        <View style={styles.presets}>
          {THEME_PRESET_COLORS.map(color => (
            <Touchable
              key={color}
              onPress={() => dispatch(setThemeColor(color))}
              style={[
                styles.preset,
                { backgroundColor: color },
                themeColor === color && [styles.presetSelected, { borderColor: colors.secondary }],
              ]}
            />
          ))}
        </View>

        <Touchable
          style={[styles.expandButton, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: rad.md }]}
          onPress={() => setOpen(v => !v)}
        >
          <View style={styles.expandLeft}>
            <View style={[styles.colorPreview, { backgroundColor: themeColor }]} />
            <Text style={[styles.expandText, { color: colors.secondary }]}>
              {t('settings.appearance.color.change')}
            </Text>
          </View>
          {open
            ? <ChevronUp size={18} color={colors.subtext} />
            : <ChevronDown size={18} color={colors.subtext} />
          }
        </Touchable>

        {open && (
          <View style={styles.picker}>
            <ColorPicker
              value={themeColor}
              onCompleteJS={c => dispatch(setThemeColor(c.hex))}
              style={{ height: 240, width: '100%' }}
            >
              <Panel1 />
              <HueSlider />
            </ColorPicker>
          </View>
        )}
      </SettingsCard>
    </>
  );
};

const styles = StyleSheet.create({
  caption: {
    ...typography.caption,
    marginBottom: spacing.tight,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  card: {
    padding: spacing.lg,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  preset: {
    flex: 1,
    height: 28,
    borderRadius: radius.sm,
  },
  presetSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  expandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    marginRight: spacing.md,
  },
  expandText: {
    ...typography.compactRowTitle,
  },
  picker: {
    paddingTop: spacing.lg,
  },
});
