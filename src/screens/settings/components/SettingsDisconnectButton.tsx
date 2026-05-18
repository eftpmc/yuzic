import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  label: string;
  onPress: () => void;
};

const SettingsDisconnectButton: React.FC<Props> = ({ label, onPress }) => {
  const { isDarkMode } = useTheme();
  const color = isDarkMode ? '#FF453A' : '#FF3B30';

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: color }]} onPress={onPress}>
      <LogOut size={18} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

export default SettingsDisconnectButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
