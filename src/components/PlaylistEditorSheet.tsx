import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ReorderableList, { reorderItems, useIsActive, useReorderableDrag } from 'react-native-reorderable-list';
import { GripVertical, Trash2, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';

import { Playlist, Song } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { useApi } from '@/api';
import { useRemoveSongFromPlaylist } from '@/hooks/playlists';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { MediaImage } from '@/components/MediaImage';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { optionSheetStyles, useOptionSheetBackground } from '@/components/options/OptionSheetPrimitives';
import { statusColor } from '@/constants/design';

export type PlaylistEditorSheetProps = {
  playlist: Playlist;
};

type EditorRowProps = {
  song: Song;
  reorderSupported: boolean;
  onRemove: (songId: string) => void;
};

const EditorRow: React.FC<EditorRowProps> = ({ song, reorderSupported, onRemove }) => {
  const { colors } = useTheme();
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View style={[styles.row, { backgroundColor: colors.card }, isActive && styles.activeRow]}>
      {reorderSupported && (
        <TouchableOpacity onLongPress={drag} delayLongPress={120} style={styles.grip}>
          <GripVertical size={20} color={colors.placeholder} />
        </TouchableOpacity>
      )}
      <MediaImage cover={song.cover} size="thumb" style={styles.cover} />
      <View style={styles.songInfo}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.secondary }]}>{song.title}</Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: colors.subtext }]}>{song.artist}</Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(song.id)} hitSlop={10} style={styles.removeButton}>
        <Trash2 size={19} color={statusColor.destructive} />
      </TouchableOpacity>
    </View>
  );
};

const PlaylistEditorSheet = forwardRef<BottomSheetModal, PlaylistEditorSheetProps>(
  ({ playlist }, ref) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const themeColor = useSelector(selectThemeColor);
    const api = useApi();
    const queryClient = useQueryClient();
    const activeServer = useSelector(selectActiveServer);
    const removeSong = useRemoveSongFromPlaylist();
    const isOffline = useIsOffline();
    const sheetBg = useOptionSheetBackground();
    const [songs, setSongs] = useState<Song[]>(playlist.songs ?? []);
    const [saving, setSaving] = useState(false);
    const reorderSupported = !!api.playlists.reorder;
    const snapPoints = useMemo(() => ['90%'], []);

    useEffect(() => {
      setSongs(playlist.songs ?? []);
    }, [playlist]);

    const close = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const handleRemove = useCallback((songId: string) => {
      setSongs(current => current.filter(song => song.id !== songId));
    }, []);

    const handleSave = useCallback(async () => {
      if (saving) return;
      const originalIds = (playlist.songs ?? []).map(song => song.id);
      const nextIds = songs.map(song => song.id);
      const removedIds = originalIds.filter(id => !nextIds.includes(id));
      const reordered = originalIds.length === nextIds.length && originalIds.some((id, index) => id !== nextIds[index]);

      setSaving(true);
      try {
        if (!isOffline && api.playlists.removeSongs) {
          await api.playlists.removeSongs(playlist.id, removedIds);
        } else {
          // Sequential on purpose: some backends (e.g. Navidrome) remove by
          // list index rather than a stable entry ID, so concurrent removals
          // computed from independently-fetched snapshots can race and
          // delete the wrong song once earlier removals shift the indices.
          for (const songId of removedIds) {
            await removeSong.mutateAsync({ playlistId: playlist.id, songId });
          }
        }
        if (reordered && reorderSupported) {
          await api.playlists.reorder!(playlist.id, nextIds);
        }

        const updated = { ...playlist, songs, subtext: `Playlist • ${songs.length} songs` };
        queryClient.setQueryData(
          [QueryKeys.Playlist, activeServer?.id, playlist.id],
          updated
        );
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.Playlists, activeServer?.id],
          refetchType: 'none',
        });
        toast.success(t('playlistEditor.toasts.saved'));
        close();
      } catch {
        toast.error(t('playlistEditor.toasts.saveFailed'));
      } finally {
        setSaving(false);
      }
    }, [activeServer?.id, api.playlists, close, isOffline, playlist, queryClient, removeSong, reorderSupported, saving, songs, t]);

    const renderItem = useCallback(({ item }: { item: Song }) => (
      <EditorRow song={item} reorderSupported={reorderSupported} onRemove={handleRemove} />
    ), [reorderSupported, handleRemove]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose={!saving}
        backdropComponent={renderBackdrop}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={close} disabled={saving} hitSlop={10}>
            <X size={22} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.secondary }]}>{t('playlistEditor.title')}</Text>
          <TouchableOpacity onPress={() => void handleSave()} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.secondary} /> : <Text style={[styles.save, { color: themeColor }]}>{t('common.done')}</Text>}
          </TouchableOpacity>
        </View>
        {!reorderSupported && (
          <Text style={[styles.notice, { color: colors.subtext }]}>{t('playlistEditor.reorderUnavailable')}</Text>
        )}
        <ReorderableList
          data={songs}
          keyExtractor={(item, index) => `${item.id}:${index}`}
          renderItem={renderItem}
          onReorder={({ from, to }) => setSongs(current => reorderItems(current, from, to))}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.subtext }]}>{t('playlist.empty')}</Text>}
        />
      </BottomSheetModal>
    );
  }
);

PlaylistEditorSheet.displayName = 'PlaylistEditorSheet';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  save: { fontSize: 16, fontWeight: '600' },
  notice: { paddingHorizontal: 18, paddingBottom: 8, fontSize: 13 },
  list: { paddingHorizontal: 12 },
  row: { minHeight: 66, marginBottom: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 8 },
  activeRow: { opacity: 0.9 },
  grip: { paddingHorizontal: 4, paddingVertical: 12 },
  cover: { width: 48, height: 48, borderRadius: 6, marginHorizontal: 8 },
  songInfo: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '500' },
  subtitle: { fontSize: 13, marginTop: 4 },
  removeButton: { padding: 8 },
  empty: { textAlign: 'center', padding: 32 },
});

export default PlaylistEditorSheet;
