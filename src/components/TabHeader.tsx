import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { fontScaleCap, hitSlopFor, iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

/** Header shared by the Home, Library and Search tabs: screen title plus the
 * account avatar. */
type Props = {
  title: string;
  username?: string;
  onAccountPress: () => void;
};

export default function TabHeader({ title, username, onAccountPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>

      <View style={styles.actions}>
        <Touchable
          accessibilityLabel={t('a11y.account')}
          accessibilityRole="button"
          style={[styles.avatar, { backgroundColor: themeColor, borderRadius: rad.pill }]}
          onPress={onAccountPress}
          {...hitSlopFor(iconSize.large)}
        >
          <Text style={styles.avatarText} maxFontSizeMultiplier={fontScaleCap.glyph}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },
});
