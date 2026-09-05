import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import Touchable from '@/components/Touchable';
import { spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export type IconSelectItem = {
  id: string;
  icon: React.ReactElement<{ color?: string }>;
  /** What this option is called. The card draws options as bare glyphs, so
   *  without it the whole row reads as a set of unnamed buttons. */
  label: string;
};

type Props = {
  title: string;
  items: IconSelectItem[];
  selected: string;
  onSelect: (id: string) => void;
};

const SettingsIconSelectCard: React.FC<Props> = ({ title, items, selected, onSelect }) => {
  const { colors } = useTheme();
  const rad = useRadius();

  return (
    <SettingsCard>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.subtext }]}>{title}</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {items.map(item => {
            const active = selected === item.id;
            return (
              <Touchable
                key={item.id}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active, checked: active }}
                onPress={() => onSelect(item.id)}
                style={[
                  styles.button,
                  {
                    backgroundColor: active ? colors.themeColor : colors.muted,
                    borderColor: active ? colors.themeColor : colors.border,
                    borderRadius: rad.md,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.caption,
    fontWeight: '500',
    marginBottom: spacing.controlGap,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
