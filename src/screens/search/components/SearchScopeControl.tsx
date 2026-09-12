import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import type { SearchResultScope } from '@/contexts/searchLegs';

type Props = {
  value: SearchResultScope;
  onChange: (value: SearchResultScope) => void;
};

/**
 * Your Library / Other sources — the top-level scope choice for Search.
 *
 * "Your Library" is the default and is what always runs on load: today's
 * local (and, per the scope setting, server) search, no external calls.
 * "Other sources" is a deliberate, separate action the user takes to reach
 * outside the library — it never runs unless picked, which is what keeps
 * library and external results from mixing without being asked for.
 */
export default function SearchScopeControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();

  const options: { key: SearchResultScope; label: string; testID: string }[] = [
    { key: 'library', label: t('search.scope.library'), testID: 'search-scope-library' },
    { key: 'other', label: t('search.scope.other'), testID: 'search-scope-other' },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.muted, borderRadius: rad.md }]}
      testID="search-scope-control"
    >
      {options.map(option => {
        const active = option.key === value;
        return (
          <Touchable
            key={option.key}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={[
              styles.segment,
              { borderRadius: radius.sm, backgroundColor: active ? colors.card : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.secondary : colors.subtext },
                active && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xxs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  segmentText: {
    ...typography.rowSubtitle,
  },
  segmentTextActive: {
    fontWeight: '600',
  },
});
