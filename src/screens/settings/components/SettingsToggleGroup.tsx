import React, { memo } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type ToggleItem = {
  label: string;
  subtext: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

type Props = {
  items: ToggleItem[];
};

const SettingsToggleGroup: React.FC<Props> = ({ items }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.label, { color: colors.secondary }]}>{item.label}</Text>
            <Text style={[styles.subtext, { color: colors.subtext }]}>{item.subtext}</Text>
          </View>
        ))}
      </View>
      <View style={styles.switches}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ true: colors.themeColor }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default memo(SettingsToggleGroup);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
  },
  labels: {
    flex: 1,
    paddingRight: 16,
  },
  switches: {
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtext: {
    fontSize: 13,
    marginTop: 2,
  },
});
