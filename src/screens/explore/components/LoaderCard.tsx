import React from 'react';
import { View, StyleSheet } from 'react-native';
import Loader from '@/components/Loader';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  width: number;
  height: number;
  radius: number;
};

export default function LoaderCard({
  width,
  height,
  radius,
}: Props) {
  const { isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          borderRadius: radius,
        },
        isDarkMode && styles.cardDark,
      ]}
    >
      <Loader />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
});
