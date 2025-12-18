import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';

export const Columns: React.FC = () => {
  const { gridColumns, setGridColumns, themeColor } = useSettings();
  const isDarkMode = Appearance.getColorScheme() === 'dark';

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
        Set how many columns are shown in grid view
      </Text>

      <View style={styles.row}>
        {[2, 3, 4].map(cols => {
          const active = gridColumns === cols;

          return (
            <TouchableOpacity
              key={cols}
              onPress={() => setGridColumns(cols)}
              style={[
                styles.columnButton,
                {
                  backgroundColor: active
                    ? themeColor
                    : isDarkMode
                    ? '#222'
                    : '#eee',
                  borderColor: isDarkMode ? '#444' : '#ccc',
                },
              ]}
            >
              <Text
                style={{
                  color: active ? '#fff' : isDarkMode ? '#ccc' : '#000',
                  fontWeight: active ? '600' : '400',
                }}
              >
                {cols} Columns
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionDark: {
    backgroundColor: '#111',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  infoTextDark: {
    color: '#aaa',
  },
  row: {
    flexDirection: 'row',
  },
  columnButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
});
