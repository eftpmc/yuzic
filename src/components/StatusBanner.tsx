import React, { ReactNode, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

type Props = {
  icon: ReactNode;
  text: string;
  /** Text color; defaults to the theme subtext color. */
  color?: string;
  /** Render a small ✕ and let the user dismiss the banner for this mount. */
  closable?: boolean;
  style?: ViewStyle;
  testID?: string;
};

// Small inline status pill used on detail screens — the same visual as the
// album header's "In Library" / "Downloading to server" row, extracted so
// other statuses (server unreachable, offline) share one look. Dismissal is
// per-mount state: the banner returns on the next visit, which is right for
// transient conditions like connectivity.
export default function StatusBanner({ icon, text, color, closable, style, testID }: Props) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const background = colors.statusSurface;
  const textColor = color ?? colors.subtext;

  return (
    <View style={[styles.row, { backgroundColor: background }, style]} testID={testID}>
      {icon}
      <Text style={[styles.text, { color: textColor }]} numberOfLines={2}>
        {text}
      </Text>
      {closable && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={testID ? `${testID}-close` : undefined}
        >
          <X size={14} color={textColor} />
        </Touchable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.tight,
    borderRadius: radius.card,
  },
  text: {
    ...typography.caption,
    fontWeight: '500',
    flex: 1,
  },
});
