import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const LETTERS = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

type Props = {
  /** Letters that have at least one matching item — others render dimmed and inert. */
  availableLetters: Set<string>;
  onSelectLetter: (letter: string) => void;
};

export default function AZIndex({ availableLetters, onSelectLetter }: Props) {
  const { colors } = useTheme();

  const handlePress = useCallback((letter: string) => {
    if (availableLetters.has(letter)) onSelectLetter(letter);
  }, [availableLetters, onSelectLetter]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {LETTERS.map(letter => {
        const isAvailable = availableLetters.has(letter);
        return (
          <TouchableOpacity
            key={letter}
            accessibilityLabel={`Jump to ${letter}`}
            accessibilityRole="button"
            disabled={!isAvailable}
            hitSlop={{ left: 8, right: 8, top: 1, bottom: 1 }}
            onPress={() => handlePress(letter)}
          >
            <Text
              style={[
                styles.letter,
                { color: isAvailable ? colors.secondary : colors.subtext },
                !isAvailable && styles.dim,
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  letter: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  dim: {
    opacity: 0.35,
  },
});
