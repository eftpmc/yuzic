import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useListDensity } from '@/hooks/useListDensity';

type Props = {
  /** Art size of the rows this stands in for. Defaults to the shared media row;
   * the library's own rows are smaller, and a placeholder that is the wrong size
   * makes the real list jump when it arrives. */
  artSize?: number;
};

const SkeletonListRow: React.FC<Props> = ({ artSize = controlSize.mediaRowArt }) => {
  const { isDarkMode } = useTheme();
  const rad = useRadius();
  const density = useListDensity();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, { marginBottom: density.rowGap }]}>
        <Skeleton
          width={artSize}
          height={artSize}
          radius={rad.thumb}
          colorMode={colorMode}
        />

        <View style={styles.textContainer}>
          <Skeleton width="70%" height={16} radius={6} colorMode={colorMode} />
          <View style={styles.lineSpacer} />
          <Skeleton width="50%" height={14} radius={6} colorMode={colorMode} />
        </View>

        <Skeleton width={20} height={20} radius={10} colorMode={colorMode} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.page,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.rowGap,
  },
  lineSpacer: {
    height: 6,
  },
});

export default SkeletonListRow;
