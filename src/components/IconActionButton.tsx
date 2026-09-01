import React from 'react';
import {
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { controlSize } from '@/constants/design';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';

type Props = {
  icon: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'compact' | 'default';
  style?: StyleProp<ViewStyle>;
};

export default function IconActionButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
  loading,
  size = 'default',
  style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Touchable
      style={[
        styles.button,
        size === 'compact' ? styles.compact : styles.default,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? <SpinningLoaderCircle size={18} color={colors.subtext} /> : icon}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    width: controlSize.iconDefault,
    height: controlSize.iconDefault,
    borderRadius: controlSize.iconDefault / 2,
  },
  compact: {
    width: controlSize.iconCompact,
    height: controlSize.iconCompact,
    borderRadius: controlSize.iconCompact / 2,
  },
  disabled: {
    opacity: 0.45,
  },
});
