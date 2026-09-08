import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography, radius } from '@/constants/design';
import Touchable from './Touchable';

type Props = {
  /** Drawn above the message. Sized 40 by convention at this scale. */
  icon?: React.ReactNode;
  message: string;
  /** A way out of the state — "Try again" on an error, "Add one" on an empty
   * list. Omitted when there is nothing useful for the finger to do. */
  action?: { label: string; onPress: () => void };
};

/**
 * The centred icon-and-message block a list falls back to when it has nothing
 * to show.
 *
 * Radio, Podcasts and Shares each had a byte-identical copy of this, plus a
 * fourth and fifth shape on Genres and the library collections — five answers
 * to one question. An empty list and a failed fetch are different states and
 * should read differently, which is what `action` is for: an empty list says
 * what to do next, a failed one offers a retry.
 */
const EmptyState: React.FC<Props> = ({ icon, message, action }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon}
      <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text>
      {action ? (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={[styles.action, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
        </Touchable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  message: { ...typography.rowSubtitle, textAlign: 'center' },
  action: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { ...typography.button },
});

export default EmptyState;
