import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet as RNStyleSheet } from 'react-native';
import LetterCover from '@/components/LetterCover';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { buildCover, buildCoverArtArchiveUrl, buildCoverCacheKey } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import ThemedHeartCover from '@/components/ThemedHeartCover';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import {
  hasImageUrlFailed,
  IMAGE_CACHE_POLICY,
  markImageUrlFailed,
  markImageUrlSucceeded,
} from '@/utils/images/imageCache';

const placeholder = require('@assets/images/placeholder.png');

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
  const activeServerId = useSelector(selectActiveServerId);
  const { colors } = useTheme();
  const uri = useMemo(() => {
    void activeServerId;
    return buildCover(cover, size);
  }, [cover, size, activeServerId]);
  const cacheKey = useMemo(() => {
    void activeServerId;
    return buildCoverCacheKey(cover, size);
  }, [cover, size, activeServerId]);
  const fallbackUri = useMemo(() => {
    if (cover.kind !== 'coverartarchive' || cover.mbidType !== 'unknown') return null;
    return buildCoverArtArchiveUrl(cover.mbid, 'release', size);
  }, [cover, size]);
  const [useFallback, setUseFallback] = useState(false);
  const [failedVersion, setFailedVersion] = useState(0);
  const primaryFailed = hasImageUrlFailed(uri);
  const fallbackFailed = hasImageUrlFailed(fallbackUri);
  const sourceUri = useMemo(() => {
    void failedVersion;
    if (useFallback && fallbackUri && !fallbackFailed) return fallbackUri;
    if (uri && !primaryFailed) return uri;
    if (fallbackUri && !fallbackFailed) return fallbackUri;
    return null;
  }, [failedVersion, fallbackFailed, fallbackUri, primaryFailed, uri, useFallback]);

  useEffect(() => {
    setUseFallback(false);
    setFailedVersion(version => version + 1);
  }, [uri, fallbackUri]);

  if (cover.kind === 'letter') {
    const flat = RNStyleSheet.flatten(style);
    const size = typeof flat?.width === 'number' ? flat.width : 80;
    const radius = typeof flat?.borderRadius === 'number' ? flat.borderRadius : 0;
    return <LetterCover name={cover.name} size={size} radius={radius} style={style} />;
  }

  if (uri === 'heart-icon') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <ThemedHeartCover />
      </View>
    );
  }

  if (!sourceUri) {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <Image
          source={placeholder}
          style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: colors.card }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <Image
        source={placeholder}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <TurboImage
        source={{ uri: sourceUri, cacheKey: cacheKey ?? sourceUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        fadeDuration={200}
        onSuccess={() => {
          markImageUrlSucceeded(sourceUri);
        }}
        onFailure={() => {
          markImageUrlFailed(sourceUri);
          setFailedVersion(version => version + 1);
          if (fallbackUri && !useFallback) setUseFallback(true);
        }}
      />
    </View>
  );
}
