import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Radio as RadioIcon, Trash2 } from 'lucide-react-native';

import { useApi } from '@/api';
import type { InternetRadioStation } from '@/api/types';
import { DetailHeaderBar } from '@/components/DetailHeader';
import Touchable from '@/components/Touchable';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useTheme } from '@/hooks/useTheme';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { stationToSong } from '@/utils/playback/buildStationSong';
import haptics from '@/utils/haptics';

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
  const rad = useRadius();
  const { playSong } = usePlayingActions();
  const [editing, setEditing] = useState<null | { mode: 'add' } | { mode: 'edit'; station: InternetRadioStation }>(null);

  const stationsQuery = useQuery({
    queryKey: ['radio-stations'],
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
              await queryClient.invalidateQueries({ queryKey: ['radio-stations'] });
            } catch {
              Alert.alert(t('common.error.unexpected'));
            }
          },
        },
      ]
    );
  }, [api.radio, queryClient, t]);

  const closeEditor = useCallback(() => setEditing(null), []);
  const refreshList = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['radio-stations'] });
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
          <Touchable
            onPress={() => setEditing({ mode: 'add' })}
            hitSlop={12}
            accessibilityLabel={t('radio.add', 'Add station')}
          >
            <Plus size={22} color={colors.secondary} />
          </Touchable>
        }
      />

      {stationsQuery.isLoading ? (
        <View style={styles.center}>
          <SpinningLoaderCircle size={24} color={colors.subtext} />
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
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Touchable
                onPress={() => handlePlay(item)}
                onLongPress={() => setEditing({ mode: 'edit', station: item })}
                style={[styles.rowBody, { borderRadius: rad.md }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.muted, borderRadius: rad.md }]}>
                  <RadioIcon size={20} color={colors.secondary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: colors.secondary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.streamUrl, { color: colors.subtext }]} numberOfLines={1}>
                    {item.streamUrl}
                  </Text>
                </View>
              </Touchable>
              <Touchable
                onPress={() => handleDelete(item)}
                hitSlop={10}
                style={styles.deleteBtn}
                accessibilityLabel={t('common.delete', 'Delete')}
              >
                <Trash2 size={18} color={colors.subtext} />
              </Touchable>
            </View>
          )}
        />
      )}

      {editing && (
        <StationEditor
          initial={editing.mode === 'edit' ? editing.station : null}
          onClose={closeEditor}
          onSaved={async () => {
            closeEditor();
            await refreshList();
          }}
        />
      )}
    </SafeAreaView>
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
  const { colors } = useTheme();
  const api = useApi();
  const rad = useRadius();
  const [name, setName] = useState(initial?.name ?? '');
  const [streamUrl, setStreamUrl] = useState(initial?.streamUrl ?? '');
  const [homepageUrl, setHomepageUrl] = useState(initial?.homepageUrl ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && /^https?:\/\//i.test(streamUrl.trim());

  const handleSave = useCallback(async () => {
    if (!canSave || saving || !api.radio) return;
    setSaving(true);
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
    } catch {
      Alert.alert(t('common.error.unexpected'));
    } finally {
      setSaving(false);
    }
  }, [api.radio, canSave, homepageUrl, initial, name, onSaved, saving, streamUrl, t]);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, borderRadius: rad.panel }]}>
          <Text style={[styles.modalTitle, { color: colors.secondary }]}>
            {initial ? t('radio.editTitle', 'Edit station') : t('radio.addTitle', 'Add station')}
          </Text>

          <FieldInput
            label={t('radio.field.name', 'Name')}
            value={name}
            onChangeText={setName}
            placeholder="Radio Paradise"
          />
          <FieldInput
            label={t('radio.field.streamUrl', 'Stream URL')}
            value={streamUrl}
            onChangeText={setStreamUrl}
            placeholder="https://stream.radioparadise.com/aac-320"
            autoCapitalize="none"
            keyboardType="url"
          />
          <FieldInput
            label={t('radio.field.homepage', 'Homepage (optional)')}
            value={homepageUrl}
            onChangeText={setHomepageUrl}
            placeholder="https://radioparadise.com"
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.modalActions}>
            <Touchable onPress={onClose} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: colors.subtext }]}>{t('common.cancel')}</Text>
            </Touchable>
            <Touchable onPress={handleSave} disabled={!canSave || saving} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: canSave ? colors.themeColor : colors.subtext }]}>
                {saving ? t('common.saving', 'Saving…') : t('common.save', 'Save')}
              </Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FieldInput({
  label,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme();
  const rad = useRadius();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.fieldInput,
          {
            backgroundColor: colors.muted,
            borderRadius: rad.md,
            color: colors.secondary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  name: { ...typography.rowTitle },
  streamUrl: { ...typography.caption, marginTop: spacing.xxs },
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
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption },
  fieldInput: {
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg, marginTop: spacing.md },
  modalBtn: { padding: spacing.sm },
  modalBtnText: { ...typography.rowTitle },
});
