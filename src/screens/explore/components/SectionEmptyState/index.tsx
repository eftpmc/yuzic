import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const H_PADDING = 12;

type Props = {
  message: string;
};

export default function SectionEmptyState({ message }: Props) {
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.text, isDarkMode && styles.textDark]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: H_PADDING,
  },
  containerDark: {},
  text: {
    fontSize: 14,
    color: '#999',
  },
  textDark: {
    color: '#555',
  },
});
