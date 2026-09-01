import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

/** Header shared by the Home, Library and Search tabs: screen title plus the
 * account avatar. */
type Props = {
  title: string;
  username?: string;
  onAccountPress: () => void;
};

export default function TabHeader({ title, username, onAccountPress }: Props) {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>

      <View style={styles.actions}>
        <Touchable
          accessibilityLabel="Account"
          accessibilityRole="button"
          style={[styles.avatar, { backgroundColor: themeColor }]}
          onPress={onAccountPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.avatarText}>
            {username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.screenTitle,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginLeft: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },
});
