import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  leftIcon?: React.ReactNode;
  rightText?: string;
};

const SettingsRow: React.FC<Props> = ({ label, onPress, leftIcon, rightText }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        {leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {rightText && (
          <Text style={[styles.rightText, { color: colors.subtext }]} numberOfLines={1}>
            {rightText}
          </Text>
        )}
        <MaterialIcons name="chevron-right" size={24} color={colors.subtext} />
      </View>
    </TouchableOpacity>
  );
};

export default SettingsRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSlot: { marginRight: 12 },
  label: { fontSize: 16 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightText: { fontSize: 15 },
});
