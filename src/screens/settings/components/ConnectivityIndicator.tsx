import React from 'react';
import { View, StyleSheet } from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  isLoading: boolean;
  isConnected: boolean;
};

const ConnectivityIndicator: React.FC<Props> = ({ isLoading, isConnected }) => {
  const { colors } = useTheme();

  if (isLoading) {
    return <SpinningLoaderCircle size={14} color={colors.themeColor} />;
  }

  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: isConnected ? '#34C759' : colors.border },
      ]}
    />
  );
};

export default ConnectivityIndicator;

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
