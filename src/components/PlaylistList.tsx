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
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { Song, Playlist } from '@/types';
import { MediaImage } from './MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaylists, usePlaylist, useCreatePlaylist, useAddSongToPlaylist, useRemoveSongFromPlaylist } from '@/hooks/playlists';
import { fetchPlaylist } from '@/hooks/playlists/usePlaylists';

type PlaylistListProps = {
  selectedSong: Song | null;
  onClose: () => void;
};

const PlaylistList = forwardRef<BottomSheetModal, PlaylistListProps>(
  ({ selectedSong, onClose }, ref) => {
    const { isDarkMode } = useTheme();
    const themeColor = useSelector(selectThemeColor);
    const insets = useSafeAreaInsets();

    const { playlists = [] } = usePlaylists();
    const createPlaylist = useCreatePlaylist();
    const addSongToPlaylist = useAddSongToPlaylist();
    const removeSongFromPlaylist = useRemoveSongFromPlaylist();

    const [searchQuery, setSearchQuery] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const snapPoints = useMemo(() => ['85%'], []);

    const filteredPlaylists = useMemo(
      () =>
        playlists.filter(p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      [playlists, searchQuery]
    );

    useEffect(() => {
      if (!selectedSong) return;

      let cancelled = false;

      (async () => {
        const ids = new Set<string>();

        for (const playlist of playlists) {
          const full = await fetchPlaylist(playlist.id);
          if (full.songs.some(s => s.id === selectedSong.id)) {
            ids.add(playlist.id);
          }
        }

        if (!cancelled) {
          setInitialIds(ids);
          setSelectedIds(new Set(ids));
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [selectedSong?.id, playlists]);


    const togglePlaylist = (id: string) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    };

    const handleCreatePlaylist = async () => {
      if (!newPlaylistName.trim()) return;
      await createPlaylist.mutateAsync(newPlaylistName.trim());
      setNewPlaylistName('');
    };

    const handleDone = async () => {
      if (!selectedSong) return;

      for (const playlist of playlists) {
        const wasIn = initialIds.has(playlist.id);
        const isIn = selectedIds.has(playlist.id);

        if (isIn && !wasIn) {
          await addSongToPlaylist.mutateAsync({
            playlistId: playlist.id,
            songId: selectedSong.id,
          });
        }

        if (!isIn && wasIn) {
          await removeSongFromPlaylist.mutateAsync({
            playlistId: playlist.id,
            songId: selectedSong.id,
          });
        }
      }

      toast.success('Playlists updated');
      onClose();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        onDismiss={onClose}
        enableDynamicSizing={false}
        stackBehavior="push"
        handleComponent={null}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#1c1c1e' : '#E5E5EA',
        }}
      >
        {/* Header (lighter grey) */}
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: isDarkMode ? '#2c2c2e' : '#F2F2F7',
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text
              style={[
                styles.cancelText,
                isDarkMode && styles.textDark,
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              isDarkMode && styles.textDark,
            ]}
          >
            Add to Playlist
          </Text>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.searchContainer,
              isDarkMode && styles.inputDark,
            ]}
          >
            <Ionicons name="search" size={20} color="#aaa" />
            <TextInput
              style={[
                styles.searchInput,
                isDarkMode && styles.textDark,
              ]}
              placeholder="Search playlists"
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.createContainer}>
            <TextInput
              style={[
                styles.newPlaylistInput,
                isDarkMode && styles.inputDark,
                isDarkMode && styles.textDark,
              ]}
              placeholder="New playlist name"
              placeholderTextColor="#aaa"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <TouchableOpacity onPress={handleCreatePlaylist}>
              <Ionicons
                name="add"
                size={26}
                color={isDarkMode ? '#fff' : '#000'}
              />
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
                  onPress={() => togglePlaylist(item.id)}
                >
                  <MediaImage
                    cover={item.cover ?? { kind: 'none' }}
                    size="thumb"
                    style={styles.playlistCover}
                  />

                  <Text
                    style={[
                      styles.optionText,
                      isDarkMode && styles.textDark,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={themeColor}
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
            ]}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }
);

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
  },
  cancelText: {
    fontSize: 16,
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  inputDark: {
    backgroundColor: '#2c2c2e',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
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
    backgroundColor: '#fff',
    marginRight: 8,
    color: '#000',
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
    color: '#000',
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
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});