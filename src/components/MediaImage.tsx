import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import ThemedHeartCover from '@/components/ThemedHeartCover';

export function MediaImage({
  cover,
  size,
  style,
}: {
  cover: CoverSource;
  size: 'thumb' | 'grid' | 'detail' | 'background';
  style?: any;
}) {
  const uri = buildCover(cover, size);

  if (uri === 'heart-icon') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <ThemedHeartCover />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[style, { backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="musical-notes-outline" size={32} color="#999" />
      </View>
    );
  }

  const priority =
    size === 'detail' || size === 'grid' ? 'high'
    : size === 'thumb' ? 'normal'
    : 'low';

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority={priority}
      transition={200}
    />
  );
}