import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';

export type IconSelectItem = {
  id: string;
  icon: React.ReactElement<{ color?: string }>;
};

type Props = {
  title: string;
  items: IconSelectItem[];
  selected: string;
  onSelect: (id: string) => void;
};

const SettingsIconSelectCard: React.FC<Props> = ({ title, items, selected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <SettingsCard>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.subtext }]}>{title}</Text>
        <View style={styles.row}>
          {items.map(item => {
            const active = selected === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onSelect(item.id)}
                activeOpacity={0.7}
                style={[
                  styles.button,
                  {
                    backgroundColor: active ? colors.themeColor : colors.muted,
                    borderColor: active ? colors.themeColor : colors.border,
                  },
                ]}
              >
                {React.cloneElement(item.icon, {
                  color: active ? '#fff' : colors.secondary,
                })}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SettingsCard>
  );
};

export default SettingsIconSelectCard;

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
