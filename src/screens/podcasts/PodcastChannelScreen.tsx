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
import EmptyState from '@/components/EmptyState';
import SkeletonListRow from '@/components/SkeletonListRow';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { useListDensity } from '@/hooks/useListDensity';
import { hitSlopFor, iconSize, spacing, typography } from '@/constants/design';
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
  const density = useListDensity();
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
      toast(t('podcasts.downloadStarted'));
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts, 'withEpisodes'] });
      }, 5_000);
    } catch {
      toast.error(t('common.error.unexpected'));
    }
  }, [api.podcasts, queryClient, t]);

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  const renderEpisode = useCallback(
    ({ item }: { item: PodcastEpisode }) => {
      const playable = item.playableStreamId !== null;
      const isDownloading = item.status === 'downloading';
      return (
        <View style={[styles.row, { paddingVertical: density.rowPadding }]}>
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
              <SpinningLoaderCircle size={iconSize.row} color={colors.subtext} />
            ) : playable ? (
              <Touchable
                onPress={() => handlePlay(item)}
                accessibilityRole="button"
                accessibilityLabel={t('podcasts.play')}
                {...hitSlopFor(22)}
              >
                <Play size={iconSize.secondary} color={colors.themeColor} fill={colors.themeColor} />
              </Touchable>
            ) : item.status === 'completed' ? (
              <CheckCircle size={iconSize.secondary} color={colors.subtext} />
            ) : (
              <Touchable
                onPress={() => void handleDownload(item)}
                accessibilityRole="button"
                accessibilityLabel={t('podcasts.download')}
                {...hitSlopFor(22)}
              >
                <ArrowDownCircle size={iconSize.secondary} color={colors.secondary} />
              </Touchable>
            )}
          </View>
        </View>
      );
    },
    [colors.secondary, colors.subtext, colors.themeColor, handlePlay, handleDownload, t, density.rowPadding]
  );

  return (
    <SafeAreaView
      testID="podcast-channel-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={channel?.title ?? t('podcasts.title')}
        subtitle={
          channel && channel.episodes.length > 0
            ? t('library.count.episodes', { count: channel.episodes.length })
            : undefined
        }
      />
      {channelsQuery.isLoading ? (
        <View style={styles.listContent}>
          {[...Array(8)].map((_, i) => <SkeletonListRow key={i} />)}
        </View>
      ) : channelsQuery.isError ? (
        <EmptyState
          message={t('common.loadFailed')}
          action={{ label: t('common.retry'), onPress: () => channelsQuery.refetch() }}
        />
      ) : !channel ? (
        <EmptyState message={t('podcasts.notFound')} />
      ) : channel.episodes.length === 0 ? (
        <EmptyState message={t('podcasts.channelEmpty')} />
      ) : (
        <FlatList
          data={channel.episodes}
          keyExtractor={(e) => e.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={renderSeparator}
          renderItem={renderEpisode}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.page },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowMain: { flex: 1, minWidth: 0 },
  title: { ...typography.rowTitle },
  meta: { ...typography.caption, marginTop: spacing.xxs },
  description: { ...typography.caption, marginTop: spacing.xxs },
  action: { padding: spacing.sm },
});
