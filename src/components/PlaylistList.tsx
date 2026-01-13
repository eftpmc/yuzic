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
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { Song, Playlist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from './MediaImage';
import { useTheme } from '@/hooks/useTheme';

type PlaylistListProps = {
  selectedSong: Song | null;
  onClose: () => void;
};

const PlaylistList = forwardRef<BottomSheet, PlaylistListProps>(
  ({ selectedSong, onClose }, ref) => {
    const { isDarkMode } = useTheme();
    const themeColor = useSelector(selectThemeColor);

    const {
      playlists,
      createPlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
    } = useLibrary();

    const queryClient = useQueryClient();
    const api = useApi();

    const [searchQuery, setSearchQuery] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

      const load = async () => {
        try {
          const fullPlaylists: Playlist[] = await Promise.all(
            playlists.map(p =>
              queryClient.fetchQuery({
                queryKey: [QueryKeys.Playlist, p.id],
                queryFn: () => api.playlists.get(p.id),
                staleTime: 2 * 60 * 1000,
              })
            )
          );

          const ids = new Set<string>();

          for (const playlist of fullPlaylists) {
            if (playlist?.songs?.some(s => s.id === selectedSong.id)) {
              ids.add(playlist.id);
            }
          }

          if (!cancelled) {
            setInitialIds(ids);
            setSelectedIds(new Set(ids));
          }
        } catch {}
      };

      load();

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
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      onClose();
    };

    const handleDone = async () => {
      if (!selectedSong) return;

      for (const playlist of playlists) {
        const wasIn = initialIds.has(playlist.id);
        const isIn = selectedIds.has(playlist.id);

        if (isIn && !wasIn) {
          await addSongToPlaylist(playlist.id, selectedSong.id);
        }

        if (!isIn && wasIn) {
          await removeSongFromPlaylist(playlist.id, selectedSong.id);
        }
      }

      toast.success('Playlists updated');
      ref?.current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        height={Dimensions.get('screen').height * 0.8}
        hasDraggableIcon={false}
        sheetBackgroundColor={isDarkMode ? '#222' : '#F2F2F7'}
      >
        <View
          style={[
            styles.container,
            isDarkMode && styles.containerDark,
          ]}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Ionicons
                name="close"
                size={24}
                color={isDarkMode ? '#fff' : '#000'}
              />
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

          <FlatList
            data={filteredPlaylists}
            keyExtractor={item => item.id}
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

                  <View style={styles.playlistDetails}>
                    <Text
                      style={[
                        styles.optionText,
                        isDarkMode && styles.textDark,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>

                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={themeColor}
                  />
                </TouchableOpacity>
              );
            }}
          />

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
      </BottomSheet>
    );
  }
);

export default PlaylistList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  containerDark: {
    backgroundColor: '#222',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  cancelButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  inputDark: {
    backgroundColor: '#333',
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
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    color: '#000',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  playlistCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    overflow: 'hidden',
  },
  playlistDetails: {
    marginLeft: 12,
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  doneButton: {
    position: 'absolute',
    bottom: 48,
    left: 48,
    right: 48,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});