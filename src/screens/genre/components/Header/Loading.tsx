import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

const LoadingGenreHeader: React.FC = () => {
  const { isDarkMode } = useTheme();
  const rad = useRadius();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        <Skeleton width="100%" height={220} colorMode={colorMode} />
      </View>

      <View style={styles.content}>
        <Skeleton width={160} height={28} radius={6} colorMode={colorMode} />
        <View style={styles.subtextGap}>
          <Skeleton width={80} height={14} radius={6} colorMode={colorMode} />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Skeleton width={controlSize.detailSecondary} height={controlSize.detailSecondary} radius={rad.pillFor(controlSize.detailSecondary)} colorMode={colorMode} />
        <Skeleton width={controlSize.detailPrimaryWidth} height={controlSize.detailPrimaryHeight} radius={rad.pillFor(controlSize.detailPrimaryHeight)} colorMode={colorMode} />
        <Skeleton width={controlSize.detailSecondary} height={controlSize.detailSecondary} radius={rad.pillFor(controlSize.detailSecondary)} colorMode={colorMode} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  subtextGap: {
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
});

export default LoadingGenreHeader;
