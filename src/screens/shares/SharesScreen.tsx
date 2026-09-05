import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';
import { Link2, Share2, Trash2 } from 'lucide-react-native';

import { useApi } from '@/api';
import type { Share } from '@/api/types';
import { DetailHeaderBar } from '@/components/DetailHeader';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { spacing, typography } from '@/constants/design';
import { QueryKeys } from '@/enums/queryKeys';
import { shareItem } from '@/utils/share';

function formatDate(value: string | undefined): string {
  if (!value) return '';
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function formatExpiry(t: (k: string, opts?: any) => string, value: string | undefined): string {
  if (!value) return t('shares.neverExpires', 'Never expires');
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  const now = Date.now();
  if (ms <= now) return t('shares.expired', 'Expired');
  return t('shares.expiresOn', { date: formatDate(value), defaultValue: `Expires ${formatDate(value)}` });
}

/**
 * Everything a user has shared — the piece that was missing. Users could
 * create a share from Album/Playlist options but had no way to list, copy,
 * revoke, or re-share their existing shares from inside the app. Every one
 * of those needs is one row on this screen.
 */
export default function SharesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollClearance = useScrollClearance();
  const api = useApi();
  const queryClient = useQueryClient();

  const sharesQuery = useQuery<Share[]>({
    queryKey: [QueryKeys.Shares],
    queryFn: async () => (await api.shares?.list()) ?? [],
    enabled: Boolean(api.shares),
    staleTime: 1000 * 60 * 5,
  });

  const shareCount = sharesQuery.data?.length ?? 0;

  // The row's primary action reopens the OS share sheet — every platform's
  // sheet has "Copy Link" built in, so keeping a separate Copy row here
  // would duplicate an affordance and require a native clipboard dep the
  // app doesn't otherwise need.
  const handleShareAgain = useCallback(async (share: Share) => {
    await shareItem({
      url: share.url,
      title: share.description ?? undefined,
      message: share.description ?? share.url,
    });
  }, []);

  const handleDelete = useCallback((share: Share) => {
    Alert.alert(
      t('shares.deleteTitle', 'Revoke share?'),
      t('shares.deleteBody', {
        title: share.description ?? share.url,
        defaultValue: `The link will stop working immediately.`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Revoke'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.shares?.remove(share.id);
              await queryClient.invalidateQueries({ queryKey: [QueryKeys.Shares] });
            } catch {
              toast.error(t('common.error.unexpected'));
            }
          },
        },
      ]
    );
  }, [api.shares, queryClient, t]);

  return (
    <SafeAreaView
      testID="shares-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={t('shares.title', 'Shared links')}
        subtitle={shareCount > 0 ? t('library.count.shares', { count: shareCount }) : undefined}
      />
      {sharesQuery.isLoading ? (
        <View style={styles.center}>
          <SpinningLoaderCircle size={26} color={colors.subtext} />
        </View>
      ) : (sharesQuery.data ?? []).length === 0 ? (
        <View style={styles.center}>
          <Link2 size={40} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('shares.empty', 'You haven’t shared anything yet. Use the Share option on an album or playlist to create a link.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sharesQuery.data}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
                  {item.description || item.url}
                </Text>
                <Text style={[styles.url, { color: colors.subtext }]} numberOfLines={1}>
                  {item.url}
                </Text>
                <Text style={[styles.meta, { color: colors.subtext }]} numberOfLines={1}>
                  {[
                    formatExpiry(t, item.expires),
                    typeof item.visitCount === 'number'
                      ? t('shares.visits', { count: item.visitCount, defaultValue: `${item.visitCount} visits` })
                      : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.actions}>
                <Touchable onPress={() => handleShareAgain(item)} hitSlop={8} style={styles.actionBtn} accessibilityLabel={t('shares.share', 'Share')}>
                  <Share2 size={18} color={colors.subtext} />
                </Touchable>
                <Touchable onPress={() => handleDelete(item)} hitSlop={8} style={styles.actionBtn} accessibilityLabel={t('common.delete', 'Revoke')}>
                  <Trash2 size={18} color={colors.subtext} />
                </Touchable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.page, gap: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowText: { flex: 1, minWidth: 0 },
  title: { ...typography.rowTitle },
  url: { ...typography.caption, marginTop: spacing.xxs },
  meta: { ...typography.caption, marginTop: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.sm },
});
