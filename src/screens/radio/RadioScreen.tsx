import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';
import { Pencil, Plus, Radio as RadioIcon, Trash2 } from 'lucide-react-native';

import { useApi } from '@/api';
import type { InternetRadioStation } from '@/api/types';
import { DetailHeaderBar, DetailHeaderIconButton } from '@/components/DetailHeader';
import { FormSheet, FormSheetField } from '@/components/FormSheet';
import MediaListRow from '@/components/MediaListRow';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { controlSize, spacing, typography } from '@/constants/design';
import { QueryKeys } from '@/enums/queryKeys';
import { useRadius } from '@/hooks/useRadius';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { useTheme } from '@/hooks/useTheme';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { stationToSong } from '@/utils/playback/buildStationSong';
import haptics from '@/utils/haptics';

type Editing =
  | { mode: 'add' }
  | { mode: 'edit'; station: InternetRadioStation };

/**
 * Radio browsing surface — Navidrome only (the empty adapter's `api.radio` is
 * undefined, and the LibraryEntryRows entry hides itself accordingly, so
 * reaching this screen already means the server supports it).
 */
export default function RadioScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();
  const queryClient = useQueryClient();
  const scrollClearance = useScrollClearance();
  const { playSong } = usePlayingActions();
  const [editing, setEditing] = useState<Editing | null>(null);

  const stationsQuery = useQuery({
    queryKey: [QueryKeys.Radio],
    queryFn: async () => (await api.radio?.list()) ?? [],
    enabled: Boolean(api.radio),
    staleTime: 1000 * 60 * 5,
  });

  const handlePlay = useCallback((station: InternetRadioStation) => {
    haptics.primary();
    void playSong(stationToSong(station));
  }, [playSong]);

  const handleDelete = useCallback((station: InternetRadioStation) => {
    Alert.alert(
      t('radio.deleteTitle', 'Delete station?'),
      t('radio.deleteBody', { name: station.name, defaultValue: `Remove "${station.name}"?` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.radio?.remove(station.id);
              await queryClient.invalidateQueries({ queryKey: [QueryKeys.Radio] });
            } catch {
              toast.error(t('common.error.unexpected'));
            }
          },
        },
      ]
    );
  }, [api.radio, queryClient, t]);

  const closeEditor = useCallback(() => setEditing(null), []);
  const refreshList = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.Radio] });
  }, [queryClient]);

  const stationCount = stationsQuery.data?.length ?? 0;

  return (
    <SafeAreaView
      testID="radio-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={t('radio.title', 'Radio')}
        subtitle={
          stationCount > 0 ? t('library.count.stations', { count: stationCount }) : undefined
        }
        rightAction={
          <DetailHeaderIconButton
            onPress={() => setEditing({ mode: 'add' })}
            accessibilityLabel={t('radio.add', 'Add station')}
          >
            <Plus size={24} color={colors.secondary} />
          </DetailHeaderIconButton>
        }
      />

      {stationsQuery.isLoading ? (
        <View style={styles.center}>
          <SpinningLoaderCircle size={26} color={colors.subtext} />
        </View>
      ) : stationsQuery.isError || !stationsQuery.data?.length ? (
        <View style={styles.center}>
          <RadioIcon size={40} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('radio.empty', 'No radio stations yet. Add one to get started.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={stationsQuery.data}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => (
            <MediaListRow
              title={item.name}
              subtitle={item.streamUrl}
              cover={{ kind: 'none' }}
              showCover={false}
              variant="compact"
              onPress={() => handlePlay(item)}
              leading={<StationIcon />}
              trailing={
                <View style={styles.rowActions}>
                  {/* Editing used to be reachable only by long-pressing the
                      row, which is both invisible and — on the Podcasts screen
                      next door — the gesture that deletes things. */}
                  <Touchable
                    onPress={() => setEditing({ mode: 'edit', station: item })}
                    hitSlop={10}
                    style={styles.rowAction}
                    accessibilityRole="button"
                    accessibilityLabel={t('radio.editTitle', 'Edit station')}
                  >
                    <Pencil size={18} color={colors.subtext} />
                  </Touchable>
                  <Touchable
                    onPress={() => handleDelete(item)}
                    hitSlop={10}
                    style={styles.rowAction}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete', 'Delete')}
                  >
                    <Trash2 size={18} color={colors.subtext} />
                  </Touchable>
                </View>
              }
            />
          )}
        />
      )}

      {editing && (
        <StationEditor
          initial={editing.mode === 'edit' ? editing.station : null}
          onClose={closeEditor}
          onSaved={refreshList}
        />
      )}
    </SafeAreaView>
  );
}

/** The stand-in for artwork a stream does not have. Sized like the thumbnail
 *  it replaces so the titles line up with every other compact row. */
function StationIcon() {
  const { colors } = useTheme();
  const rad = useRadius();
  return (
    <View style={[styles.iconWrap, { backgroundColor: colors.muted, borderRadius: rad.thumb }]}>
      <RadioIcon size={20} color={colors.secondary} />
    </View>
  );
}

function StationEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: InternetRadioStation | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const [name, setName] = useState(initial?.name ?? '');
  const [streamUrl, setStreamUrl] = useState(initial?.streamUrl ?? '');
  const [homepageUrl, setHomepageUrl] = useState(initial?.homepageUrl ?? '');

  const canSave = name.trim().length > 0 && /^https?:\/\//i.test(streamUrl.trim());

  const handleSave = useCallback(async () => {
    if (!api.radio) return false;
    try {
      const payload = {
        name: name.trim(),
        streamUrl: streamUrl.trim(),
        homepageUrl: homepageUrl.trim() || undefined,
      };
      if (initial) {
        await api.radio.update({ id: initial.id, ...payload });
      } else {
        await api.radio.create(payload);
      }
      await onSaved();
      return true;
    } catch {
      toast.error(t('common.error.unexpected'));
      return false;
    }
  }, [api.radio, homepageUrl, initial, name, onSaved, streamUrl, t]);

  return (
    <FormSheet
      title={initial ? t('radio.editTitle', 'Edit station') : t('radio.addTitle', 'Add station')}
      submitLabel={t('common.save', 'Save')}
      canSubmit={canSave}
      onSubmit={handleSave}
      onClose={onClose}
    >
      <FormSheetField
        label={t('radio.field.name', 'Name')}
        value={name}
        onChangeText={setName}
        placeholder="Radio Paradise"
      />
      <FormSheetField
        label={t('radio.field.streamUrl', 'Stream URL')}
        value={streamUrl}
        onChangeText={setStreamUrl}
        placeholder="https://stream.radioparadise.com/aac-320"
        autoCapitalize="none"
        keyboardType="url"
      />
      <FormSheetField
        label={t('radio.field.homepage', 'Homepage (optional)')}
        value={homepageUrl}
        onChangeText={setHomepageUrl}
        placeholder="https://radioparadise.com"
        autoCapitalize="none"
        keyboardType="url"
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  listContent: { paddingVertical: spacing.md },
  // Inset to match `MediaListRow`'s own page padding, so the rule starts where
  // the row's content does rather than running to the screen edge.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.page,
  },
  iconWrap: {
    width: controlSize.compactMediaRowArt,
    height: controlSize.compactMediaRowArt,
    alignItems: 'center',
    justifyContent: 'center',
    // A row with no cover gives its text no left margin, because the usual
    // such row has nothing in front of the text at all.
    marginRight: spacing.rowGap,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.inlineGap },
  rowAction: { padding: spacing.xs },
});
