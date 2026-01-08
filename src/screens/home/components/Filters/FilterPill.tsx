import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props<T extends string> = {
  label: string;
  value: T;
  active: boolean;
  activeBackgroundColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
  onPress: (value: T) => void;
};

export function FilterPill<T extends string>({
  label,
  value,
  active,
  activeBackgroundColor,
  activeTextColor,
  inactiveTextColor,
  onPress,
}: Props<T>) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        active && { backgroundColor: activeBackgroundColor },
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
    borderWidth: 1,
    borderColor: '#555',
  },
  text: {
    fontSize: 14,
  },
  activeText: {
    fontWeight: '600',
  },
});