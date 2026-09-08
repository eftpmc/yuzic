import React from 'react';
import { ScrollView, StyleSheet, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import Header from './Header';
import { spacing } from '@/constants/design';
import { useScrollClearance } from '@/hooks/useScrollClearance';

type Props = {
  title: string;
  children: React.ReactNode;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  scrollContentStyle?: ViewStyle;
};

const SettingsScreen: React.FC<Props> = ({
  title,
  children,
  onBackPress,
  rightAction,
  scrollContentStyle,
}) => {
  const { colors } = useTheme();
  const scrollClearance = useScrollClearance();

  return (
    <SafeAreaView
      // Top only, like every other screen. The default is all four edges, and
      // the bottom one paints the home-indicator inset as a dead black band
      // between the last card and the playing bar — the dock is a real docked
      // tabBar that already owns that space, so claiming it twice just leaves
      // a strip of background no content can reach.
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: colors.background },
        Platform.OS === 'android' && { paddingTop: spacing.xl },
      ]}
    >
      <Header title={title} onBackPress={onBackPress} rightAction={rightAction} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollClearance },
          scrollContentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
  },
});
