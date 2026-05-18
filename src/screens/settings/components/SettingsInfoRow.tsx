import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  label: string;
  value?: string;
  right?: React.ReactNode;
  stacked?: boolean;
};

const SettingsInfoRow: React.FC<Props> = ({ label, value, right, stacked }) => {
  const { colors } = useTheme();

  if (stacked) {
    return (
      <View style={styles.stackedRow}>
        <View style={styles.stackedLeft}>
          <Text style={[styles.stackedLabel, { color: colors.subtext }]}>{label}</Text>
          <Text style={[styles.stackedValue, { color: colors.secondary }]} numberOfLines={1}>
            {value ?? '—'}
          </Text>
        </View>
        {right && <View style={styles.stackedRight}>{right}</View>}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
      {right ?? (
        <Text style={[styles.value, { color: colors.subtext }]} numberOfLines={1}>
          {value ?? '—'}
        </Text>
      )}
    </View>
  );
};

export default SettingsInfoRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'right',
  },
  stackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stackedLeft: {
    flex: 1,
  },
  stackedRight: {
    marginLeft: 12,
  },
  stackedLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 3,
  },
  stackedValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
