import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Appearance,
} from 'react-native';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
  activeColor: string;
  style?: any;
};

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  value,
  onToggle,
  activeColor,
  style,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark, style]}>
      <View style={styles.row}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          {label}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          style={[
            styles.switch,
            {
              backgroundColor: value
                ? activeColor
                : isDarkMode
                ? '#333'
                : '#ddd',
            },
          ]}
        >
          <View
            style={[
              styles.thumb,
              {
                transform: [{ translateX: value ? 18 : 2 }],
              },
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
    paddingRight: 12,
  },
  labelDark: {
    color: '#aaa',
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginLeft: 2,
    backgroundColor: '#fff',
    elevation: 2,
  },
});