import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

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
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    ...typography.rowTitle,
  },
  paddedRow: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 48,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
