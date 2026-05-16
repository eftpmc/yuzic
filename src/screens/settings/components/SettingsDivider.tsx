import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  style?: ViewStyle;
};

const SettingsDivider: React.FC<Props> = ({ style }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }, style]} />
  );
};

export default SettingsDivider;

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '92%',
    alignSelf: 'center',
  },
});
