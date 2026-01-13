import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectThemeColor,
  selectThemeMode,
} from '@/utils/redux/selectors/settingsSelectors';
import { setThemeMode, ThemeMode } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

export const ThemeModeSelector: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const themeMode = useSelector(selectThemeMode) as ThemeMode;
  const { colors } = useTheme();

  const options: {
    id: ThemeMode;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { id: 'light', icon: 'sunny' },
    { id: 'dark', icon: 'moon' },
    { id: 'system', icon: 'phone-portrait' },
  ];

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={[styles.title, { color: colors.text }]}>
            Theme
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Light, dark, or system
          </Text>
        </View>

        <View style={styles.controls}>
          {options.map(option => {
            const active = themeMode === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => dispatch(setThemeMode(option.id))}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: active
                      ? themeColor
                      : colors.muted,
                    borderColor: active
                      ? themeColor
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={active ? '#fff' : colors.text}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  textColumn: {
    flex: 1,
    paddingRight: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: '600',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },

  controls: {
    flexDirection: 'row',
  },

  modeButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});