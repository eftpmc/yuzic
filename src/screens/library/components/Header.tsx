import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  title: string;
  username?: string;
  onSearch: () => void;
  onAccountPress: () => void;
};

export default function HomeHeader({ title, username, onSearch, onAccountPress }: Props) {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityLabel="Search"
          accessibilityRole="button"
          onPress={onSearch}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Search size={24} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Account"
          accessibilityRole="button"
          style={[styles.avatar, { backgroundColor: themeColor }]}
          onPress={onAccountPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.avatarText}>
            {username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },
});
