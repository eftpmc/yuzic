import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  onPress: () => void;
};

const SongOptionsButton: React.FC<Props> = ({ onPress }) => {
  const { isDarkMode } = useTheme();

  return (
    <TouchableOpacity style={styles.moreButton} onPress={onPress}>
      <Ionicons
        name="ellipsis-horizontal"
        size={22}
        color={isDarkMode ? '#fff' : '#000'}
      />
    </TouchableOpacity>
  );
};

export default SongOptionsButton;

const styles = StyleSheet.create({
  moreButton: {
    padding: 8,
  },
});
