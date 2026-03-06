import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArrowDownAZ, Calendar, Clock3, Flame, Grid2x2, List } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { selectIsGridView } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type SortOrder = 'title' | 'recent' | 'userplays' | 'year';

type Props = {
  sortOrder: SortOrder;
  onSortPress: () => void;
  onGridSettingsPress: () => void;
};

export default function LibraryListHeader({
  sortOrder,
  onSortPress,
  onGridSettingsPress,
}: Props) {
  const { isDarkMode } = useTheme();
  const isGridView = useSelector(selectIsGridView);
  const iconColor = isDarkMode ? '#fff' : '#000';

  const SortIcon =
    sortOrder === 'title'
      ? ArrowDownAZ
      : sortOrder === 'year'
      ? Calendar
      : sortOrder === 'userplays'
      ? Flame
      : Clock3;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconButton} onPress={onSortPress}>
        <SortIcon size={20} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={onGridSettingsPress}>
        {isGridView ? (
          <List size={20} color={iconColor} />
        ) : (
          <Grid2x2 size={20} color={iconColor} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
});