import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';
import { SECTION_H_PADDING } from '@/features/home/constants';

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
    paddingHorizontal: SECTION_H_PADDING,
  },
  text: { ...typography.rowSubtitle },
});
