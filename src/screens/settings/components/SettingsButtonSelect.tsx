import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import Touchable from '@/components/Touchable';
import { spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export type ButtonSelectItem = {
  id: string;
  icon: React.ReactElement<{ color?: string }>;
};

type Props = {
  items: ButtonSelectItem[];
  selected: string;
  onSelect: (id: string) => void;
  title?: string;
  caption?: string;
};

const SettingsButtonSelect: React.FC<Props> = ({ items, selected, onSelect, title, caption }) => {
  const { colors } = useTheme();
  const rad = useRadius();

  const buttons = (
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
  );

  return (
    <>
      {caption && (
        <Text style={[styles.caption, { color: colors.subtext }]}>{caption}</Text>
      )}
      <SettingsCard>
        {title ? (
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>
            {buttons}
          </View>
        ) : (
          <View style={styles.paddedRow}>{buttons}</View>
        )}
      </SettingsCard>
    </>
  );
};

export default SettingsButtonSelect;

const styles = StyleSheet.create({
  caption: {
    ...typography.caption,
    marginBottom: spacing.tight,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.rowTitle,
  },
  paddedRow: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 48,
    height: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
