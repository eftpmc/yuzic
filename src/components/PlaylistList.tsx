import React, {
  useState,
  forwardRef,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { X, Search, Plus, Check } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { Playlist, Song } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from './MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  usePlaylists,
  useCreatePlaylist,
  useAddSongToPlaylist,
  useRemoveSongFromPlaylist,
} from '@/hooks/playlists';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type PlaylistListProps = {
  selectedSong: Song | null;
  onClose: () => void;
};

const PlaylistList = forwardRef<BottomSheetModal, PlaylistListProps>(
  ({ selectedSong, onClose }, ref) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const isOffline = useIsOffline();
    const themeColor = useSelector(selectThemeColor);
    const insets = useSafeAreaInsets();

    const api = useApi();
    const queryClient = useQueryClient();
    const activeServer = useSelector(selectActiveServer);
    const { playlists } = usePlaylists();
    const createPlaylist = useCreatePlaylist();
    const addSongToPlaylist = useAddSongToPlaylist();
    const removeSongFromPlaylist = useRemoveSongFromPlaylist();

    const [searchQuery, setSearchQuery] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [baseSelectedIds, setBaseSelectedIds] = useState<Set<string>>(new Set());
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [membershipLoading, setMembershipLoading] = useState(false);

    const snapPoints = useMemo(() => ['85%'], []);

    const filteredPlaylists = useMemo(
      () =>
        playlists.filter(p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      [playlists, searchQuery]
    );

    const initialIds = useMemo(() => {
      if (!selectedSong) return new Set<string>();
      const selectedSongId = selectedSong.id;

      return new Set(
        playlists
          .filter(p => {
            // Individual playlist cache has full songs (populated when user opens a playlist)
            const cached = queryClient.getQueryData<Playlist | null>(
              [QueryKeys.Playlist, activeServer?.id, p.id]
            );
            if (cached) return cached.songs.some(s => s.id === selectedSongId);
            return false;
          })
          .map(p => p.id)
      );
    }, [playlists, selectedSong, queryClient, activeServer?.id]);

    useEffect(() => {
      setSelectedIds(new Set(initialIds));
      setBaseSelectedIds(new Set(initialIds));
    }, [initialIds]);

    useEffect(() => {
      if (!isSheetOpen || !selectedSong || !activeServer?.id || !playlists.length) {
        setMembershipLoading(false);
        return;
      }

      let cancelled = false;
      const selectedSongId = selectedSong.id;
      setMembershipLoading(true);

      Promise.allSettled(
        playlists.map(playlist =>
          queryClient.fetchQuery({
            queryKey: [QueryKeys.Playlist, activeServer.id, playlist.id],
            queryFn: () => api.playlists.get(playlist.id),
            staleTime: staleTime.playlists,
          })
        )
      )
        .then(results => {
          if (cancelled) return;
          const hydratedIds = new Set<string>();
          results.forEach((result, index) => {
            if (
              result.status === 'fulfilled' &&
              result.value.songs.some(song => song.id === selectedSongId)
            ) {
              hydratedIds.add(playlists[index].id);
            }
          });
          setSelectedIds(hydratedIds);
          setBaseSelectedIds(hydratedIds);
        })
        .finally(() => {
          if (!cancelled) setMembershipLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [activeServer?.id, api, isSheetOpen, playlists, queryClient, selectedSong]);

    const togglePlaylist = (id: string) => {
      if (membershipLoading) return;
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const handleCreatePlaylist = async () => {
      if (!newPlaylistName.trim()) return;
      try {
        await createPlaylist.mutateAsync(newPlaylistName.trim());
        setNewPlaylistName('');
      } catch (e) {
        if (e instanceof Error && e.message === 'offline') {
          toast.error(t('common.offline.notAvailable'));
        } else {
          toast.error(t('playlistList.createFailed'));
        }
      }
    };

    const handleDone = async () => {
      if (!selectedSong) return;
      const wasOffline = isOffline;

      const mutations: Promise<unknown>[] = [];
      for (const playlist of playlists) {
        const wasIn = baseSelectedIds.has(playlist.id);
        const isIn = selectedIds.has(playlist.id);

        if (isIn && !wasIn) {
          mutations.push(addSongToPlaylist.mutateAsync({
            playlistId: playlist.id,
            song: selectedSong,
          }));
        } else if (!isIn && wasIn) {
          mutations.push(removeSongFromPlaylist.mutateAsync({
            playlistId: playlist.id,
            songId: selectedSong.id,
          }));
        }
      }

      const results = await Promise.allSettled(mutations);
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        toast.error(t('playlistList.updateFailed'));
      } else {
        toast.success(t(wasOffline ? 'playlistList.updatedOffline' : 'playlistList.updated'));
        onClose();
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        onDismiss={onClose}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        stackBehavior="push"
        handleComponent={null}
        onChange={(index) => setIsSheetOpen(index >= 0)}
        backgroundStyle={{ backgroundColor: colors.muted }}
      >
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: colors.card,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <X size={20} color={colors.secondary} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.secondary }]}>
            {t('playlistList.title')}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Search size={20} color={colors.placeholder} />
            <TextInput
              style={[styles.searchInput, { color: colors.secondary }]}
              placeholder={t('playlistList.searchPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.createContainer}>
            <TextInput
              style={[styles.newPlaylistInput, { backgroundColor: colors.card, color: colors.secondary }]}
              placeholder={t('playlistList.newPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <TouchableOpacity onPress={handleCreatePlaylist}>
              <Plus size={26} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          <BottomSheetFlatList
            data={filteredPlaylists}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => {
              const isChecked = selectedIds.has(item.id);

              return (
                <TouchableOpacity
                  style={styles.option}
                  disabled={membershipLoading}
                  onPress={() => togglePlaylist(item.id)}
                >
                  <MediaImage
                    cover={item.cover ?? { kind: 'none' }}
                    size="thumb"
                    style={styles.playlistCover}
                  />

                  <Text style={[styles.optionText, { color: colors.secondary }]}>
                    {item.title}
                  </Text>

                  <Check
                    size={24}
                    color={themeColor}
                    style={{ opacity: isChecked ? 1 : 0 }}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View
          style={[
            styles.doneWrapper,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.doneButton,
              { backgroundColor: themeColor },
              membershipLoading && styles.doneButtonDisabled,
            ]}
            disabled={membershipLoading}
            onPress={handleDone}
          >
            {membershipLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.doneButtonText}>{t('common.done')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }
);

PlaylistList.displayName = 'PlaylistList';

export default PlaylistList;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    position: 'absolute',
    left: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  createContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  newPlaylistInput: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginRight: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  playlistCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  doneWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  doneButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#fff',
  },
});
