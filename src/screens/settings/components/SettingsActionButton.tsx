import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'destructive';
  disabled?: boolean;
};

const SettingsActionButton: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
}) => {
  const { colors, isDarkMode } = useTheme();

  const backgroundColor = variant === 'destructive'
    ? (isDarkMode ? '#FF453A' : '#FF3B30')
    : colors.themeColor;

  return (
    <Touchable
      style={[styles.button, { backgroundColor, opacity: disabled ? 0.4 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{label}</Text>
    </Touchable>
  );
};

export default SettingsActionButton;

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  label: {
    ...typography.sheetTitle,
    color: '#fff',
  },
});
