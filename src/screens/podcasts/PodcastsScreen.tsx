import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { toast } from '@backpackapp-io/react-native-toast';
import { AlertTriangle, Plus, Podcast as PodcastIcon, RefreshCw, Trash2 } from 'lucide-react-native';

import { useApi } from '@/api';
import type { PodcastChannel } from '@/api/types';
import { DetailHeaderBar, DetailHeaderIconButton } from '@/components/DetailHeader';
import { FormSheet, FormSheetField } from '@/components/FormSheet';
import MediaListRow from '@/components/MediaListRow';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import EmptyState from '@/components/EmptyState';
import SkeletonListRow from '@/components/SkeletonListRow';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { hitSlopFor, spacing, statusColor } from '@/constants/design';
import { QueryKeys } from '@/enums/queryKeys';
import type { CoverSource } from '@/types';

export default function PodcastsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const scrollClearance = useScrollClearance();
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const channelsQuery = useQuery<PodcastChannel[]>({
    queryKey: [QueryKeys.Podcasts],
    queryFn: async () => (await api.podcasts?.list(false)) ?? [],
    enabled: Boolean(api.podcasts),
    staleTime: 1000 * 60 * 15,
  });

  // The requery below is scheduled, not awaited, so leaving the screen
  // mid-refresh has to cancel it — otherwise the timer fires against an
  // unmounted screen and `refreshing` stays pinned true for the full 5s.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!api.podcasts || refreshing) return;
    setRefreshing(true);
    try {
      await api.podcasts.refreshAll();
      // Refresh is async on the server; requery in a beat to catch the
      // updated channel list — most feeds finish within 5s of the request.
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        void queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts] });
        setRefreshing(false);
      }, 5_000);
    } catch {
      setRefreshing(false);
      toast.error(t('common.error.unexpected'));
    }
  }, [api.podcasts, queryClient, refreshing, t]);

  const channelCount = channelsQuery.data?.length ?? 0;

  const handleDelete = useCallback((channel: PodcastChannel) => {
    Alert.alert(
      t('podcasts.unsubscribeTitle'),
      t('podcasts.unsubscribeBody', { title: channel.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('podcasts.unsubscribe'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.podcasts?.unsubscribe(channel.id);
              await queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts] });
            } catch {
              toast.error(t('common.error.unexpected'));
            }
          },
        },
      ]
    );
  }, [api.podcasts, queryClient, t]);

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  const renderChannel = useCallback(
    ({ item }: { item: PodcastChannel }) => {
      // Through `MediaImage` like every other cover in the app, rather than a
      // hand-built URL into a raw image view: that is what makes it resolve
      // against the active server, fall back, and show the app's placeholder
      // instead of a blank square.
      const cover: CoverSource = item.coverArt
        ? { kind: 'navidrome', coverArtId: item.coverArt }
        : { kind: 'none' };
      return (
        <MediaListRow
          title={item.title}
          subtitle={item.errorMessage || item.description || ''}
          cover={cover}
          onPress={() => navigation.push('podcastChannel', { channelId: item.id })}
          // The message a broken feed reports reads in the same grey as a
          // show's own blurb, so the row says which one it is.
          subtitleTrailing={
            item.errorMessage
              ? <AlertTriangle size={14} color={statusColor.warningText} />
              : undefined
          }
          trailing={
            <Touchable
              onPress={() => handleDelete(item)}
              {...hitSlopFor(18)}
              style={styles.rowAction}
              accessibilityRole="button"
              accessibilityLabel={t('podcasts.unsubscribe')}
            >
              <Trash2 size={18} color={colors.subtext} />
            </Touchable>
          }
        />
      );
    },
    [navigation, handleDelete, colors.subtext, t]
  );

  return (
    <SafeAreaView
      testID="podcasts-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={t('podcasts.title')}
        subtitle={
          channelCount > 0 ? t('library.count.podcasts', { count: channelCount }) : undefined
        }
        rightAction={
          <View style={styles.headerActions}>
            <DetailHeaderIconButton
              onPress={handleRefresh}
              accessibilityLabel={t('podcasts.refresh')}
            >
              {refreshing
                ? <SpinningLoaderCircle size={18} color={colors.secondary} />
                : <RefreshCw size={24} color={colors.secondary} />
              }
            </DetailHeaderIconButton>
            <DetailHeaderIconButton
              onPress={() => setAdding(true)}
              accessibilityLabel={t('podcasts.add')}
            >
              <Plus size={24} color={colors.secondary} />
            </DetailHeaderIconButton>
          </View>
        }
      />

      {channelsQuery.isLoading ? (
        <View style={styles.listContent}>
          {[...Array(8)].map((_, i) => <SkeletonListRow key={i} />)}
        </View>
      ) : channelsQuery.isError ? (
        <EmptyState
          icon={<PodcastIcon size={40} color={colors.subtext} />}
          message={t('common.loadFailed')}
          action={{ label: t('common.retry'), onPress: () => channelsQuery.refetch() }}
        />
      ) : (channelsQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon={<PodcastIcon size={40} color={colors.subtext} />}
          message={t('podcasts.empty')}
          action={{ label: t('podcasts.add'), onPress: () => setAdding(true) }}
        />
      ) : (
        <FlatList
          data={channelsQuery.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={renderSeparator}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.secondary}
            />
          }
          renderItem={renderChannel}
        />
      )}

      {adding && (
        <SubscribeSheet
          onClose={() => setAdding(false)}
          onSubscribed={async () => {
            await queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

function SubscribeSheet({
  onClose,
  onSubscribed,
}: {
  onClose: () => void;
  onSubscribed: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const [url, setUrl] = useState('');

  const canSave = /^https?:\/\//i.test(url.trim());

  const handleSave = useCallback(async () => {
    if (!api.podcasts) return false;
    try {
      await api.podcasts.subscribe(url.trim());
      await onSubscribed();
      return true;
    } catch {
      toast.error(t('podcasts.subscribeFailed'));
      return false;
    }
  }, [api.podcasts, onSubscribed, t, url]);

  return (
    <FormSheet
      title={t('podcasts.addTitle')}
      description={t('podcasts.addHelp')}
      // Said what it does. The button used to read `t('common.save',
      // 'Subscribe')`, and since `common.save` exists that fallback never
      // showed — the sheet titled "Subscribe to a podcast" ended in "Save".
      submitLabel={t('podcasts.add')}
      canSubmit={canSave}
      onSubmit={handleSave}
      onClose={onClose}
    >
      <FormSheetField
        label={t('podcasts.field.feedUrl')}
        value={url}
        onChangeText={setUrl}
        placeholder="https://feeds.example.com/podcast.xml"
        autoCapitalize="none"
        keyboardType="url"
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  listContent: { paddingVertical: spacing.md },
  // Inset to match `MediaListRow`'s own page padding, so the rule starts where
  // the row's content does rather than running to the screen edge.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.page,
  },
  rowAction: { padding: spacing.xs },
});
