import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectIsGridView } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  sortLabel: string;
  onSortPress: () => void;
  onToggleView: () => void;
};

export default function LibraryListHeader({
  sortLabel,
  onSortPress,
  onToggleView,
}: Props) {
  const { isDarkMode } = useTheme();
  const isGridView = useSelector(selectIsGridView);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.sortButton} onPress={onSortPress}>
        <Ionicons
          name="swap-vertical-outline"
          size={20}
          color={isDarkMode ? '#fff' : '#000'}
        />
        <Text style={[styles.sortText, isDarkMode && styles.sortTextDark]}>
          {sortLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.viewToggleButton} onPress={onToggleView}>
        <Ionicons
          name={isGridView ? 'list-outline' : 'grid-outline'}
          size={20}
          color={isDarkMode ? '#fff' : '#000'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  sortText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  sortTextDark: {
    color: '#fff',
  },
  viewToggleButton: {
    padding: 8,
  },
});