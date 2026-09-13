import { fontScaleCap, onDark } from '@/constants/design';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';

import { useApi } from '@/api';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
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

  const buildUri = useCallback(() => {
    void activeServerId;
    try {
      return api.user?.avatarUrl() ?? null;
    } catch {
      // A URL builder should not throw, but a broken server record can leave
      // one without the host it needs. The letter is a fine answer to that.
      return null;
    }
  }, [api, activeServerId]);
  const [uri, setUri] = useState(buildUri);
  // Unlike Navidrome's signed URL, MediaBrowser avatar URLs are stable. Keep a
  // separate reload generation so focus refreshes those images too instead of
  // depending on a provider to change its URL.
  const [reloadGeneration, setReloadGeneration] = useState(0);

  // An active-server switch needs its own source immediately; a focus effect
  // alone would leave the previous account visible until the next navigation.
  const previousServerId = useRef(activeServerId);
  useEffect(() => {
    if (previousServerId.current === activeServerId) return;
    previousServerId.current = activeServerId;
    setUri(buildUri());
    setFailed(false);
    setReloadGeneration(generation => generation + 1);
  }, [activeServerId, buildUri]);

  // Tab screens stay mounted, so a header can otherwise retain the source it
  // created before the user updated their picture on the server. Keep the
  // existing signed URL — rebuilding Navidrome's would defeat its cache on each
  // tab switch — and explicitly reload it. This also refreshes deterministic
  // Jellyfin/Emby URLs without provider-specific cache busters.
  useFocusEffect(useCallback(() => {
    setFailed(false);
    setReloadGeneration(generation => generation + 1);
  }, []));

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
        testID="user-avatar-image"
        key={`${uri}:${reloadGeneration}`}
        source={{ uri, cache: reloadGeneration ? 'reload' : 'default' }}
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
    color: onDark.text,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
