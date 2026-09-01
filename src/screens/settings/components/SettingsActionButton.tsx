import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

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
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  label: {
    ...typography.sheetTitle,
    color: '#fff',
  },
});
