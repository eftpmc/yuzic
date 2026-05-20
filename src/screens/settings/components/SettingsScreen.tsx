import React from 'react';
import { ScrollView, StyleSheet, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import Header from './Header';

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

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title={title} onBackPress={onBackPress} rightAction={rightAction} />
      <ScrollView contentContainerStyle={[styles.scrollContent, scrollContentStyle]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 180,
  },
});
