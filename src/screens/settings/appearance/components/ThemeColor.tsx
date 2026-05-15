import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeColor } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

const DEFAULT_COLOR = '#ff7f7f';

const PRESET_COLORS = [
  DEFAULT_COLOR,
  '#ff9f43',
  '#ffd32a',
  '#0be881',
  '#54a0ff',
  '#5f27cd',
];

export const ThemeColor: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const [open, setOpen] = useState(false);
  const { isDarkMode, colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.infoText, { color: colors.subtext }]}>
        {t('settings.appearance.color.info')}
      </Text>

      <View style={styles.presets}>
        {PRESET_COLORS.map(color => (
          <TouchableOpacity
            key={color}
            onPress={() => dispatch(setThemeColor(color))}
            style={[
              styles.preset,
              { backgroundColor: color },
              themeColor === color && styles.presetSelected,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
        onPress={() => setOpen(v => !v)}
      >
        <View style={styles.leftGroup}>
          <View style={[styles.colorPreview, { backgroundColor: themeColor }]} />
          <Text style={[styles.rowText, { color: colors.text }]}>
            {t('settings.appearance.color.change')}
          </Text>
        </View>

        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={20}
          color={colors.subtext}
        />
      </TouchableOpacity>

      {open && (
        <View style={{ paddingTop: 16 }}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  preset: {
    flex: 1,
    height: 28,
    borderRadius: 6,
  },
  presetSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  rowText: { fontSize: 16 },
});