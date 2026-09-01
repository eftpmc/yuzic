import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

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
              <Touchable
                key={item.id}
                onPress={() => onSelect(item.id)}
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
              </Touchable>
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
    ...typography.caption,
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
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
