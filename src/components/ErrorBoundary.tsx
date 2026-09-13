import { onDark } from '@/constants/design';
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message} numberOfLines={4}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Touchable style={styles.button} onPress={() => RNRestart.Restart()}>
          <Text style={styles.buttonText}>Restart App</Text>
        </Touchable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onDark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  title: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: onDark.text,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.rowSubtitle,
    color: onDark.subtext,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: onDark.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: onDark.border,
  },
  buttonText: {
    ...typography.button,
    color: onDark.text,
  },
});
