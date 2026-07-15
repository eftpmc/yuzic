import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { controlSize, spacing, typography } from '@/constants/design';

type Props = {
  title: string;
  visible: boolean;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Compact detail navigation chrome shown after the large hero scrolls away. */
export default function DetailTopBar({ title, visible, rightAction, style }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          height: insets.top + controlSize.topBarHeight,
          backgroundColor: colors.overlay,
          borderBottomColor: colors.border,
          opacity: visible ? 1 : 0,
        },
        style,
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        onPress={() => navigation.goBack()}
        style={styles.button}
      >
        <ChevronLeft size={24} color={colors.secondary} />
      </TouchableOpacity>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.secondary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {rightAction ?? <View style={styles.button} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: controlSize.iconCompact,
    height: controlSize.iconCompact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
    ...typography.navigationTitle,
  },
});
