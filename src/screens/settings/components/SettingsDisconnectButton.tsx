import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  label: string;
  onPress: () => void;
};

const SettingsDisconnectButton: React.FC<Props> = ({ label, onPress }) => {
  const { colors } = useTheme();
  const rad = useRadius();

  return (
    <Touchable style={[styles.button, { backgroundColor: colors.destructive, borderRadius: rad.md }]} onPress={onPress}>
      <LogOut size={iconSize.row} color="#fff" />
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
    gap: 8,
  },
  label: {
    ...typography.sheetTitle,
    color: '#fff',
  },
});
