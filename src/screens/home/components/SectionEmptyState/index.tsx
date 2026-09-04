import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';

const H_PADDING = 12;

type Props = {
  message: string;
};

export default function SectionEmptyState({ message }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.subtext }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    paddingHorizontal: H_PADDING,
  },
  text: { ...typography.rowSubtitle },
});
