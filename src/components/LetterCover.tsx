import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

const PALETTE = [
  '#E57373', '#F06292', '#BA68C8', '#7986CB',
  '#64B5F6', '#4DB6AC', '#81C784', '#FFB74D',
  '#A1887F', '#90A4AE',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

type Props = {
  name: string;
  size: number;
  radius: number;
  style?: StyleProp<ViewStyle>;
};

export default function LetterCover({ name, size, radius, style }: Props) {
  const bg = colorFromName(name);
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  const fontSize = Math.round(size * 0.38);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: bg }, style]}>
      <Text style={[styles.letter, { fontSize }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#fff',
    fontWeight: '600',
  },
});
