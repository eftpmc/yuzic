import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  title: string;
  action?: React.ReactNode;
};

const SettingsCardHeader: React.FC<Props> = ({ title, action }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>
      {action}
    </View>
  );
};

export default SettingsCardHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
