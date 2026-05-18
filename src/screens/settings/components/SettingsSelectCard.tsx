import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsCard from './SettingsCard';
import SettingsDivider from './SettingsDivider';
import SettingsRow from './SettingsRow';

export type SelectItem = { key: string; label: string };

type Props = {
  title?: string;
  items: SelectItem[];
  isSelected: (key: string) => boolean;
  onSelect: (key: string) => void;
  multiSelect?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
};

const SettingsSelectCard: React.FC<Props> = ({
  title,
  items,
  isSelected,
  onSelect,
  multiSelect = false,
  isLoading = false,
  disabled = false,
}) => {
  const { colors } = useTheme();

  return (
    <>
      {title && (
        <Text style={[styles.title, { color: colors.subtext }]}>{title}</Text>
      )}
      <SettingsCard>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.themeColor} />
          </View>
        ) : (
          items.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <SettingsDivider />}
              <SettingsRow
                label={item.label}
                onPress={() => !disabled && onSelect(item.key)}
                {...(multiSelect
                  ? { checked: isSelected(item.key) }
                  : { selected: isSelected(item.key) }
                )}
              />
            </React.Fragment>
          ))
        )}
      </SettingsCard>
    </>
  );
};

export default SettingsSelectCard;

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 4,
  },
  loader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
