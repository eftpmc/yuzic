import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import ThemedHeartCover from '@/components/ThemedHeartCover';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

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
  // Subscribe so we re-render when active server becomes available or changes.
  // buildCover() reads from the store; without this, URLs stay null until
  // some other state (e.g. list data) causes a re-render.
  useSelector(selectActiveServer);
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