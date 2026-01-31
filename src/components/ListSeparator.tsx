import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const ListSeparator: React.FC = () => {
  const { isDarkMode } = useTheme();
  return (
    <View
      style={[
        styles.separator,
        isDarkMode && styles.separatorDark,
      ]}
    />
  );
};

export default ListSeparator;

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  separatorDark: {
    backgroundColor: '#333',
  },
});
