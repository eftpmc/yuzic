import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const SettingsCard: React.FC<Props> = ({ children, style }) => {
  const { colors } = useTheme();
  const rad = useRadius();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: rad.card }, style]}>
      {children}
    </View>
  );
};

export default SettingsCard;

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
});
