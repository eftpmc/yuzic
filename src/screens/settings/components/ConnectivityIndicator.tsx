import React from 'react';
import { iconSize, statusColor } from '@/constants/design';
import { View, StyleSheet } from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  isLoading: boolean;
  isConnected: boolean;
};

const ConnectivityIndicator: React.FC<Props> = ({ isLoading, isConnected }) => {
  const { colors } = useTheme();
  const rad = useRadius();

  if (isLoading) {
    return <SpinningLoaderCircle size={iconSize.badge} color={colors.themeColor} />;
  }

  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: isConnected ? statusColor.success : colors.border, borderRadius: rad.pill },
      ]}
    />
  );
};

export default ConnectivityIndicator;

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
  },
});
