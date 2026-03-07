import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeColor } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

export const ThemeColor: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const [open, setOpen] = useState(false);
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
        {t('settings.appearance.color.info')}
      </Text>

      <TouchableOpacity
        style={[styles.optionButton, isDarkMode && styles.optionButtonDark]}
        onPress={() => setOpen(v => !v)}
      >
        <View style={styles.leftGroup}>
          <View style={[styles.colorPreview, { backgroundColor: themeColor }]} />
          <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
            {t('settings.appearance.color.change')}
          </Text>
        </View>

        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={20}
          color={isDarkMode ? '#ccc' : '#666'}
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
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  infoTextDark: {
    color: '#aaa',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f1f1',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  rowText: { fontSize: 16, color: '#000' },
  rowTextDark: { color: '#fff' },
});