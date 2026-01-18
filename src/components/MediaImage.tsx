import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import ThemedHeartCover from '@/components/ThemedHeartCover';

const PLACEHOLDER = require('@assets/images/placeholder.png');

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

  const priority =
    size === 'detail' || size === 'grid'
      ? 'high'
      : size === 'thumb'
      ? 'normal'
      : 'low';

  return (
    <Image
      source={uri ? { uri } : PLACEHOLDER}
      placeholder={PLACEHOLDER}
      placeholderContentFit="cover"
      contentFit="cover"
      style={style}
      cachePolicy="memory-disk"
      priority={priority}
      transition={200}
    />
  );
}