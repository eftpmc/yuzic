import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

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
        <View style={[styles.optionList, styles.loader]}>
          <SpinningLoaderCircle size={18} color={themeColor} />
        </View>
      ) : (
        <View style={[styles.optionList, !infoText && styles.optionListTopPad]}>
          {items.map(item => {
            const active = isSelected(item.key);
            return (
              <Touchable
                key={item.key}
                onPress={() => onSelect(item.key)}
                disabled={disabled}
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
              </Touchable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: 18,
  },
  infoText: {
    ...typography.caption,
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
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    ...typography.button,
    flex: 1,
  },
});
