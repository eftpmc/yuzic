import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';
import { ArrowDownCircle, CheckCircle, Play } from 'lucide-react-native';

import { useApi } from '@/api';
import type { PodcastChannel, PodcastEpisode } from '@/api/types';
import { DetailHeaderBar } from '@/components/DetailHeader';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { spacing, typography } from '@/constants/design';
import { QueryKeys } from '@/enums/queryKeys';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { podcastEpisodeToSong } from '@/utils/playback/buildPodcastSong';

function formatDate(publishDate: string | undefined): string {
  if (!publishDate) return '';
  try {
    return new Date(publishDate).toLocaleDateString();
  } catch {
    return publishDate;
  }
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PodcastChannelScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollClearance = useScrollClearance();
  const api = useApi();
  const queryClient = useQueryClient();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { playSong } = usePlayingActions();

  const channelsQuery = useQuery<PodcastChannel[]>({
    queryKey: [QueryKeys.Podcasts, 'withEpisodes'],
    queryFn: async () => (await api.podcasts?.list(true)) ?? [],
    enabled: Boolean(api.podcasts),
    staleTime: 1000 * 60 * 5,
  });

  const channel = useMemo(
    () => (channelsQuery.data ?? []).find((c) => c.id === channelId) ?? null,
    [channelsQuery.data, channelId]
  );

  const handlePlay = useCallback((episode: PodcastEpisode) => {
    if (!channel || !episode.playableStreamId) return;
    // buildStreamUrl needs the server-side stream id, not the episode id.
    // playableStreamId is only populated once the episode is downloaded, so
    // this path only fires for downloaded episodes.
    const streamUrl = api.songs.buildStreamUrl(episode.playableStreamId, 'high');
    void playSong(podcastEpisodeToSong(episode, channel, streamUrl));
  }, [api.songs, channel, playSong]);

  const handleDownload = useCallback(async (episode: PodcastEpisode) => {
    if (!api.podcasts) return;
    try {
      await api.podcasts.downloadEpisode(episode.id);
      toast(t('podcasts.downloadStarted', 'Download started'));
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts, 'withEpisodes'] });
      }, 5_000);
    } catch {
      toast.error(t('common.error.unexpected'));
    }
  }, [api.podcasts, queryClient, t]);

  return (
    <SafeAreaView
      testID="podcast-channel-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={channel?.title ?? t('podcasts.title', 'Podcast')}
        subtitle={
          channel && channel.episodes.length > 0
            ? t('library.count.episodes', { count: channel.episodes.length })
            : undefined
        }
      />
      {channelsQuery.isLoading ? (
        <View style={styles.center}>
          <SpinningLoaderCircle size={26} color={colors.subtext} />
        </View>
      ) : !channel ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('podcasts.notFound', 'Podcast not found.')}
          </Text>
        </View>
      ) : channel.episodes.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('podcasts.channelEmpty', 'No episodes yet — try refreshing.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={channel.episodes}
          keyExtractor={(e) => e.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => {
            const playable = item.playableStreamId !== null;
            const isDownloading = item.status === 'downloading';
            return (
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: colors.subtext }]} numberOfLines={1}>
                    {[formatDate(item.publishDate), formatDuration(item.durationSeconds)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {item.description ? (
                    <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.action}>
                  {isDownloading ? (
                    <SpinningLoaderCircle size={18} color={colors.subtext} />
                  ) : playable ? (
                    <Touchable
                      onPress={() => handlePlay(item)}
                      accessibilityLabel={t('podcasts.play', 'Play episode')}
                      hitSlop={10}
                    >
                      <Play size={22} color={colors.themeColor} fill={colors.themeColor} />
                    </Touchable>
                  ) : item.status === 'completed' ? (
                    <CheckCircle size={22} color={colors.subtext} />
                  ) : (
                    <Touchable
                      onPress={() => void handleDownload(item)}
                      accessibilityLabel={t('podcasts.download', 'Download episode')}
                      hitSlop={10}
                    >
                      <ArrowDownCircle size={22} color={colors.secondary} />
                    </Touchable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.page },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowMain: { flex: 1, minWidth: 0 },
  title: { ...typography.rowTitle },
  meta: { ...typography.caption, marginTop: spacing.xxs },
  description: { ...typography.caption, marginTop: spacing.xxs },
  action: { padding: spacing.sm },
});
