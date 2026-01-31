import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const H_PADDING = 16;

type Props = {
  /** Use for song rows (no row margin); centers line with symmetric padding */
  variant?: 'default' | 'compact';
};

const ListSeparator: React.FC<Props> = ({ variant = 'default' }) => {
  const { isDarkMode } = useTheme();
  const wrapperStyle =
    variant === 'compact' ? styles.wrapperCompact : styles.wrapper;
  return (
    <View style={wrapperStyle}>
      <View
        style={[
          styles.line,
          isDarkMode && styles.lineDark,
        ]}
      />
    </View>
  );
};

export default ListSeparator;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: H_PADDING,
    marginTop: -8,
    paddingBottom: 8,
  },
  wrapperCompact: {
    paddingHorizontal: H_PADDING,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    width: '100%',
  },
  lineDark: {
    backgroundColor: '#333',
  },
});
