import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { toast } from '@backpackapp-io/react-native-toast';
import { Plus, Podcast as PodcastIcon, RefreshCw, Trash2 } from 'lucide-react-native';

import { useApi } from '@/api';
import type { PodcastChannel } from '@/api/types';
import Header from '@/screens/settings/components/Header';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { spacing, typography } from '@/constants/design';
import { QueryKeys } from '@/enums/queryKeys';
import { buildCover } from '@/utils/builders/buildCover';
import TurboImage from 'react-native-turbo-image';

export default function PodcastsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const api = useApi();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const channelsQuery = useQuery<PodcastChannel[]>({
    queryKey: [QueryKeys.Podcasts],
    queryFn: async () => (await api.podcasts?.list(false)) ?? [],
    enabled: Boolean(api.podcasts),
    staleTime: 1000 * 60 * 15,
  });

  const handleRefresh = useCallback(async () => {
    if (!api.podcasts) return;
    setRefreshing(true);
    try {
      await api.podcasts.refreshAll();
      // Refresh is async on the server; requery in a beat to catch the
      // updated channel list — most feeds finish within 5s of the request.
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts] });
        setRefreshing(false);
      }, 5_000);
    } catch {
      setRefreshing(false);
      toast.error(t('common.error.unexpected'));
    }
  }, [api.podcasts, queryClient, t]);

  const handleDelete = useCallback((channel: PodcastChannel) => {
    Alert.alert(
      t('podcasts.unsubscribeTitle', 'Unsubscribe?'),
      t('podcasts.unsubscribeBody', { title: channel.title, defaultValue: `Stop following "${channel.title}"?` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Unsubscribe'),
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t('podcasts.title', 'Podcasts')}
        rightAction={
          <View style={styles.headerActions}>
            <Touchable
              onPress={handleRefresh}
              hitSlop={12}
              accessibilityLabel={t('podcasts.refresh', 'Refresh')}
              disabled={refreshing}
            >
              {refreshing
                ? <SpinningLoaderCircle size={22} color={colors.secondary} />
                : <RefreshCw size={22} color={colors.secondary} />
              }
            </Touchable>
            <Touchable
              onPress={() => setAdding(true)}
              hitSlop={12}
              accessibilityLabel={t('podcasts.add', 'Add podcast')}
            >
              <Plus size={22} color={colors.secondary} />
            </Touchable>
          </View>
        }
      />

      {channelsQuery.isLoading ? (
        <View style={styles.center}>
          <SpinningLoaderCircle size={24} color={colors.subtext} />
        </View>
      ) : (channelsQuery.data ?? []).length === 0 ? (
        <View style={styles.center}>
          <PodcastIcon size={40} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('podcasts.empty', 'No podcasts yet. Add one to start listening.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={channelsQuery.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.secondary}
            />
          }
          renderItem={({ item }) => {
            const coverUri = item.coverArt
              ? buildCover({ kind: 'navidrome', coverArtId: item.coverArt }, 'grid')
              : null;
            return (
              <View style={styles.row}>
                <Touchable
                  onPress={() => navigation.push('podcastChannel', { channelId: item.id })}
                  onLongPress={() => handleDelete(item)}
                  style={styles.rowBody}
                >
                  {coverUri ? (
                    <TurboImage
                      source={{ uri: coverUri }}
                      style={[styles.channelCover, { borderRadius: rad.md }]}
                    />
                  ) : (
                    <View style={[styles.channelCover, styles.channelCoverFallback, { backgroundColor: colors.muted, borderRadius: rad.md }]}>
                      <PodcastIcon size={20} color={colors.subtext} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={[styles.name, { color: colors.secondary }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.errorMessage ? (
                      <Text style={[styles.error, { color: colors.subtext }]} numberOfLines={2}>
                        {item.errorMessage}
                      </Text>
                    ) : item.description ? (
                      <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </Touchable>
                <Touchable
                  onPress={() => handleDelete(item)}
                  hitSlop={10}
                  style={styles.deleteBtn}
                  accessibilityLabel={t('common.delete', 'Unsubscribe')}
                >
                  <Trash2 size={18} color={colors.subtext} />
                </Touchable>
              </View>
            );
          }}
        />
      )}

      {adding && (
        <SubscribeModal
          onClose={() => setAdding(false)}
          onSubscribed={async () => {
            setAdding(false);
            await queryClient.invalidateQueries({ queryKey: [QueryKeys.Podcasts] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

function SubscribeModal({ onClose, onSubscribed }: { onClose: () => void; onSubscribed: () => Promise<void> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const api = useApi();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = /^https?:\/\//i.test(url.trim());

  const handleSave = useCallback(async () => {
    if (!canSave || saving || !api.podcasts) return;
    setSaving(true);
    try {
      await api.podcasts.subscribe(url.trim());
      await onSubscribed();
    } catch {
      toast.error(t('podcasts.subscribeFailed', 'Could not subscribe to that feed'));
    } finally {
      setSaving(false);
    }
  }, [api.podcasts, canSave, onSubscribed, saving, t, url]);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, borderRadius: rad.panel }]}>
          <Text style={[styles.modalTitle, { color: colors.secondary }]}>
            {t('podcasts.addTitle', 'Subscribe to a podcast')}
          </Text>
          <Text style={[styles.modalHelp, { color: colors.subtext }]}>
            {t('podcasts.addHelp', 'Paste the RSS feed URL for the show.')}
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://feeds.example.com/podcast.xml"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            keyboardType="url"
            style={[
              styles.input,
              { backgroundColor: colors.muted, borderRadius: rad.md, color: colors.secondary },
            ]}
          />
          <View style={styles.modalActions}>
            <Touchable onPress={onClose} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: colors.subtext }]}>{t('common.cancel')}</Text>
            </Touchable>
            <Touchable onPress={handleSave} disabled={!canSave || saving} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: canSave ? colors.themeColor : colors.subtext }]}>
                {saving ? t('common.saving', 'Saving…') : t('common.save', 'Subscribe')}
              </Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  channelCover: { width: 56, height: 56 },
  channelCoverFallback: { alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  name: { ...typography.rowTitle },
  description: { ...typography.caption, marginTop: spacing.xxs },
  error: { ...typography.caption, marginTop: spacing.xxs, fontStyle: 'italic' },
  deleteBtn: { padding: spacing.md },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420, padding: spacing.lg, gap: spacing.md },
  modalTitle: { ...typography.sectionTitle },
  modalHelp: { ...typography.caption },
  input: { ...typography.body, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg, marginTop: spacing.md },
  modalBtn: { padding: spacing.sm },
  modalBtnText: { ...typography.rowTitle },
});
