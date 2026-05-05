import React, { useEffect, useMemo, useState } from 'react';
import { View, Image } from 'react-native';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { buildCover, buildCoverArtArchiveUrl } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import ThemedHeartCover from '@/components/ThemedHeartCover';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';

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
  const uri = useMemo(() => {
    void activeServerId;
    return buildCover(cover, size);
  }, [cover, size, activeServerId]);
  const fallbackUri = useMemo(() => {
    if (cover.kind !== 'coverartarchive' || cover.mbidType !== 'unknown') return null;
    return buildCoverArtArchiveUrl(cover.mbid, 'release', size);
  }, [cover, size]);
  const [useFallback, setUseFallback] = useState(false);
  const sourceUri = useFallback && fallbackUri ? fallbackUri : uri;

  useEffect(() => {
    setUseFallback(false);
  }, [uri, fallbackUri]);

  if (uri === 'heart-icon') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <ThemedHeartCover />
      </View>
    );
  }

  if (!sourceUri) {
    return (
      <Image
        source={placeholder}
        style={[style, { backgroundColor: '#1e1e1e' }]}
        resizeMode="cover"
      />
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
        source={{ uri: sourceUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        cachePolicy="dataCache"
        fadeDuration={200}
        onFailure={() => {
          if (fallbackUri && !useFallback) setUseFallback(true);
        }}
      />
    </View>
  );
}
