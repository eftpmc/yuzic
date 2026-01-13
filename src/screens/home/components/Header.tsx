import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  title: string;
  username?: string;
  onSearch: () => void;
  onAccountPress: () => void;
};

export default function HomeHeader({
  title,
  username,
  onSearch,
  onAccountPress,
}: Props) {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {title}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onSearch}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="search"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>

        <TouchableOpacity
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
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
    fontWeight: 'bold',
  },
});
