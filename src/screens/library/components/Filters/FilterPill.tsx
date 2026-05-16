import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props<T extends string> = {
  label: string;
  value: T;
  active: boolean;
  activeBackgroundColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
  inactiveBackgroundColor?: string;
  onPress: (value: T) => void;
};

export function FilterPill<T extends string>({
  label,
  value,
  active,
  activeBackgroundColor,
  activeTextColor,
  inactiveTextColor,
  inactiveBackgroundColor,
  onPress,
}: Props<T>) {
  return (
    <TouchableOpacity
      accessibilityLabel={`${label} filter`}
      accessibilityRole="button"
      testID={`library-filter-${value}`}
      style={[
        styles.button,
        active
          ? { backgroundColor: activeBackgroundColor }
          : inactiveBackgroundColor
            ? { backgroundColor: inactiveBackgroundColor }
            : undefined,
      ]}
      onPress={() => onPress(value)}
    >
      <Text
        style={[
          styles.text,
          { color: active ? activeTextColor : inactiveTextColor },
          active && styles.activeText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
  },
  activeText: {
    fontWeight: '500',
  },
});
