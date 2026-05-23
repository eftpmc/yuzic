import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  leftIcon?: React.ReactNode;
  rightText?: string;
  status?: 'connected' | 'disconnected' | 'enabled' | 'disabled';
  selected?: boolean;
  checked?: boolean;
};

const STATUS_COLORS = {
  connected: '#34C759',
  enabled: '#34C759',
  disconnected: '#8E8E93',
  disabled: '#8E8E93',
};

const SettingsRow: React.FC<Props> = ({ label, onPress, leftIcon, rightText, status, selected, checked }) => {
  const { colors } = useTheme();
  const isRadio = selected !== undefined;
  const isCheckbox = checked !== undefined;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {status && (
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
        )}
        {rightText && (
          <Text style={[styles.rightText, { color: colors.subtext }]} numberOfLines={1}>
            {rightText}
          </Text>
        )}
        {isRadio ? (
          <View style={[styles.radio, { borderColor: selected ? colors.themeColor : colors.border }]}>
            {selected && <View style={[styles.radioFill, { backgroundColor: colors.themeColor }]} />}
          </View>
        ) : isCheckbox ? (
          <View style={[
            styles.checkbox,
            checked
              ? { backgroundColor: colors.themeColor, borderColor: colors.themeColor }
              : { borderColor: colors.border },
          ]}>
            {checked && <Check size={13} color="#fff" strokeWidth={3} />}
          </View>
        ) : (
          <ChevronRight size={18} color={colors.border} />
        )}
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
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: { fontSize: 16, fontWeight: '500' },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rightText: { fontSize: 14 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
