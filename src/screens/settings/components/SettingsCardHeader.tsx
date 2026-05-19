import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  title: string;
  action?: React.ReactNode;
  subtle?: boolean;
};

const SettingsCardHeader: React.FC<Props> = ({ title, action, subtle }) => {
  const { colors } = useTheme();
  return (
    <View style={subtle ? styles.subtleHeader : styles.header}>
      <Text style={subtle
        ? [styles.subtleTitle, { color: colors.subtext }]
        : [styles.title, { color: colors.secondary }]
      }>{title}</Text>
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
  subtleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 4,
    marginTop: 16,
    marginBottom: 6,
  },
  subtleTitle: {
    fontSize: 13,
  },
});
