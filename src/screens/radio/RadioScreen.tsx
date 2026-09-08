import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
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
import EmptyState from '@/components/EmptyState';
import SkeletonListRow from '@/components/SkeletonListRow';
import { controlSize, hitSlopFor, iconSize, spacing } from '@/constants/design';
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
      t('radio.deleteTitle'),
      t('radio.deleteBody', { name: station.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  const renderStation = useCallback(
    ({ item }: { item: InternetRadioStation }) => (
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
            {/* Editing used to be reachable only by long-pressing the row,
                which is both invisible and — on the Podcasts screen next
                door — the gesture that deletes things. */}
            <Touchable
              onPress={() => setEditing({ mode: 'edit', station: item })}
              hitSlop={hitSlopFor(18)}
              style={styles.rowAction}
              accessibilityRole="button"
              accessibilityLabel={t('radio.editTitle')}
            >
              <Pencil size={iconSize.row} color={colors.subtext} />
            </Touchable>
            <Touchable
              onPress={() => handleDelete(item)}
              hitSlop={hitSlopFor(18)}
              style={styles.rowAction}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Trash2 size={iconSize.row} color={colors.subtext} />
            </Touchable>
          </View>
        }
      />
    ),
    [handlePlay, handleDelete, colors.subtext, t]
  );

  const stationCount = stationsQuery.data?.length ?? 0;

  return (
    <SafeAreaView
      testID="radio-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar
        title={t('radio.title')}
        subtitle={
          stationCount > 0 ? t('library.count.stations', { count: stationCount }) : undefined
        }
        rightAction={
          <DetailHeaderIconButton
            onPress={() => setEditing({ mode: 'add' })}
            accessibilityLabel={t('radio.add')}
          >
            <Plus size={iconSize.header} color={colors.secondary} />
          </DetailHeaderIconButton>
        }
      />

      {stationsQuery.isLoading ? (
        <View style={styles.listContent}>
          {[...Array(8)].map((_, i) => (
            <SkeletonListRow key={i} artSize={controlSize.compactMediaRowArt} />
          ))}
        </View>
      ) : stationsQuery.isError ? (
        <EmptyState
          icon={<RadioIcon size={iconSize.emptyState} color={colors.subtext} />}
          message={t('common.loadFailed')}
          action={{ label: t('common.retry'), onPress: () => stationsQuery.refetch() }}
        />
      ) : !stationsQuery.data?.length ? (
        <EmptyState
          icon={<RadioIcon size={iconSize.emptyState} color={colors.subtext} />}
          message={t('radio.empty')}
          action={{ label: t('radio.add'), onPress: () => setEditing({ mode: 'add' }) }}
        />
      ) : (
        <FlatList
          data={stationsQuery.data}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollClearance }]}
          ItemSeparatorComponent={renderSeparator}
          renderItem={renderStation}
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
      <RadioIcon size={iconSize.control} color={colors.secondary} />
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
      title={initial ? t('radio.editTitle') : t('radio.addTitle')}
      submitLabel={t('common.save')}
      canSubmit={canSave}
      onSubmit={handleSave}
      onClose={onClose}
    >
      <FormSheetField
        label={t('radio.field.name')}
        value={name}
        onChangeText={setName}
        placeholder="Radio Paradise"
      />
      <FormSheetField
        label={t('radio.field.streamUrl')}
        value={streamUrl}
        onChangeText={setStreamUrl}
        placeholder="https://stream.radioparadise.com/aac-320"
        autoCapitalize="none"
        keyboardType="url"
      />
      <FormSheetField
        label={t('radio.field.homepage')}
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
