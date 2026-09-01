import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

type Props = {
  label: string;
  onPress: () => void;
};

const SettingsDisconnectButton: React.FC<Props> = ({ label, onPress }) => {
  const { isDarkMode } = useTheme();
  const color = isDarkMode ? '#FF453A' : '#FF3B30';

  return (
    <Touchable style={[styles.button, { backgroundColor: color }]} onPress={onPress}>
      <LogOut size={18} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </Touchable>
  );
};

export default SettingsDisconnectButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: 8,
  },
  label: {
    ...typography.sheetTitle,
    color: '#fff',
  },
});
