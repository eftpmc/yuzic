import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';

type Item = {
  key: string;
  label: string;
};

type Props = {
  infoText?: string;
  items: Item[];
  isSelected: (key: string) => boolean;
  onSelect: (key: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export default function ChecklistSection({
  infoText,
  items,
  isSelected,
  onSelect,
  isLoading = false,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      {infoText && (
        <Text style={[styles.infoText, { color: colors.subtext }]}>
          {infoText}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={themeColor}
          style={[styles.optionList, styles.loader]}
        />
      ) : (
        <View style={[styles.optionList, !infoText && styles.optionListTopPad]}>
          {items.map(item => {
            const active = isSelected(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => onSelect(item.key)}
                disabled={disabled}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: colors.muted,
                    borderColor: active ? themeColor : colors.border,
                    opacity: disabled ? 0.6 : 1,
                  },
                ]}
              >
                <View style={[
                  styles.checkbox,
                  active
                    ? { backgroundColor: themeColor, borderColor: themeColor }
                    : { borderColor: colors.border },
                ]}>
                  {active && <Check size={14} color="#fff" />}
                </View>
                <Text style={[styles.optionLabel, { color: colors.secondary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
  },
  infoText: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  optionList: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionListTopPad: {
    paddingTop: 16,
  },
  loader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
