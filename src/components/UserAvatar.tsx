import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';

import { useApi } from '@/api';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { fontScaleCap } from '@/constants/design';

/**
 * The signed-in user's profile picture, or their initial in a coloured disc.
 *
 * Both drawings were already in the app three times over — the tab header, the
 * account sheet and the settings card each built the disc themselves — so the
 * picture is added here once rather than in each of them.
 *
 * Navidrome answers `getAvatar` for every account: a gravatar where one is
 * configured, its own generated image otherwise. Jellyfin and Emby serve the
 * user's primary image. Neither was ever requested, so every account in the app
 * showed a letter (#202).
 *
 * The fallback is not a failure state. A server with no `user` capability, an
 * image that 404s, and a request that times out all land on the initial, which
 * is exactly what the app drew before — so this can only ever add.
 */
export default function UserAvatar({
  username,
  size,
  borderRadius,
  style,
}: {
  username?: string;
  size: number;
  /** Passed in rather than read here, so the caller's `useRadius` preset wins. */
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
}) {
  const api = useApi();
  const themeColor = useSelector(selectThemeColor);
  // Rebuild when the server changes: the URL carries that server's host and
  // credentials, so a stale one would draw the previous account's picture.
  const activeServerId = useSelector(selectActiveServerId);
  const [failed, setFailed] = useState(false);

  const uri = useMemo(() => {
    void activeServerId;
    try {
      return api.user?.avatarUrl() ?? null;
    } catch {
      // A URL builder should not throw, but a broken server record can leave
      // one without the host it needs. The letter is a fine answer to that.
      return null;
    }
  }, [api, activeServerId]);

  // A changed server gives the new image one clean attempt. This is an effect
  // rather than a state update during render, which React rejects in strict
  // render paths.
  useEffect(() => setFailed(false), [uri]);

  const initial = username?.[0]?.toUpperCase() || '?';
  const frame = [
    styles.frame,
    { width: size, height: size, borderRadius, backgroundColor: themeColor },
    style,
  ];

  if (!uri || failed) {
    return (
      <View style={frame}>
        <Text
          style={[styles.initial, { fontSize: size * 0.45 }]}
          maxFontSizeMultiplier={fontScaleCap.glyph}
        >
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <View style={frame}>
      <Text
        style={[styles.initial, { fontSize: size * 0.45 }]}
        maxFontSizeMultiplier={fontScaleCap.glyph}
      >
        {initial}
      </Text>
      <Image
        source={{ uri }}
        style={[styles.image, { borderRadius, position: 'absolute' }]}
        // The letter stays underneath while the picture loads, so the header
        // never has a hole in it on a cold start.
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
