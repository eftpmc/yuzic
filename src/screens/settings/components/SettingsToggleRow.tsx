import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/design';

type Props = {
  label: string;
  subtext?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

const SettingsToggleRow: React.FC<Props> = ({ label, subtext, value, onValueChange }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
        {subtext && (
          <Text style={[styles.subtext, { color: colors.subtext }]}>{subtext}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.themeColor }}
        thumbColor="#fff"
      />
    </View>
  );
};

export default SettingsToggleRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  left: { flex: 1 },
  label: { ...typography.rowTitle },
  subtext: { ...typography.caption, marginTop: 2 },
});
