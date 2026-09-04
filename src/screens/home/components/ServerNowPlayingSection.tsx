import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { QueryKeys } from '@/enums/queryKeys';
import { SECTION_H_PADDING as H_PADDING } from '@/features/home/constants';
import type { NowPlayingEntry } from '@/api/types';
import { spacing, typography } from '@/constants/design';

/**
 * Who else is on the server right now. Multi-user Navidromes surface this as
 * a social touch — solo users see themselves and can safely ignore. Fetched
 * on a short stale time because the point is "right now".
 */
export default function ServerNowPlayingSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();

  const query = useQuery<NowPlayingEntry[]>({
    queryKey: [QueryKeys.ServerNowPlaying],
    queryFn: async () => (await api.discovery?.getNowPlaying()) ?? [],
    enabled: Boolean(api.discovery),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  const data = query.data ?? [];
  if (!api.discovery || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.serverNowPlaying', 'Playing on your server')}
      </Text>
      <View style={styles.list}>
        {data.slice(0, 5).map((e) => (
          <View key={`${e.username}-${e.songId}`} style={styles.row}>
            <Text style={[styles.username, { color: colors.secondary }]} numberOfLines={1}>
              {e.username}
            </Text>
            <Text style={[styles.trackLine, { color: colors.subtext }]} numberOfLines={1}>
              {e.title}
              {e.artist ? ` — ${e.artist}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, marginBottom: spacing.md, marginLeft: H_PADDING },
  list: { paddingHorizontal: H_PADDING, gap: spacing.sm },
  row: { flexDirection: 'column', gap: spacing.xxs },
  username: { ...typography.rowTitle },
  trackLine: { ...typography.caption },
});
