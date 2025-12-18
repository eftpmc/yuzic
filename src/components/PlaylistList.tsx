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
    useColorScheme,
    Dimensions,
} from 'react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import CoverArt from '@/components/CoverArt';
import { useSelector } from 'react-redux';
import store from '@/utils/redux/store';
import { selectPlaylistList } from '@/utils/redux/librarySelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type PlaylistListProps = {
    selectedSong: any;
    onClose: () => void;
};

const PlaylistList = forwardRef<BottomSheet, PlaylistListProps>(
    ({ selectedSong, onClose }, ref) => {
        const colorScheme = useColorScheme();
        const isDarkMode = colorScheme === 'dark';
        const { themeColor } = useSettings();

        const playlists = useSelector(selectPlaylistList);

        const {
            createPlaylist,
            addSongToPlaylist,
            removeSongFromPlaylist,
            getPlaylist,
        } = useLibrary();

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
                const ids = new Set<string>();

                for (const playlist of playlists) {
                    const state = store.getState();
                    let full = state.library.playlistsById[playlist.id];

                    if (!full?.songs) {
                        await getPlaylist(playlist.id);
                        full = store.getState().library.playlistsById[playlist.id];
                    }

                    if (full?.songs?.some(s => s.id === selectedSong.id)) {
                        ids.add(playlist.id);
                    }
                }

                if (!cancelled) {
                    setInitialIds(ids);
                    setSelectedIds(new Set(ids));
                }
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

            ref?.current?.close();
        };

        return (
            <BottomSheet
                ref={ref}
                height={Dimensions.get('screen').height * 0.8}
                hasDraggableIcon={false}
                sheetBackgroundColor={isDarkMode ? '#222' : '#f9f9f9'}
            >
                <View style={styles.bottomSheetContainer(isDarkMode)}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle(isDarkMode)}>
                            Add to Playlist
                        </Text>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#aaa" />
                        <TextInput
                            style={styles.searchInput(isDarkMode)}
                            placeholder="Search playlists"
                            placeholderTextColor="#aaa"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.createContainer}>
                        <TextInput
                            style={styles.newPlaylistInput(isDarkMode)}
                            placeholder="New playlist name"
                            placeholderTextColor="#aaa"
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                        />
                        <TouchableOpacity onPress={handleCreatePlaylist}>
                            <Ionicons name="add" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredPlaylists}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isChecked = selectedIds.has(item.id);

                            return (
                                <TouchableOpacity
                                    style={styles.bottomSheetOption}
                                    onPress={() => togglePlaylist(item.id)}
                                >
                                    <CoverArt source={item.cover ?? null} size={50} />
                                    <View style={styles.playlistDetails}>
                                        <Text style={styles.bottomSheetOptionText(isDarkMode)}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={
                                            isChecked
                                                ? 'checkmark-circle'
                                                : 'ellipse-outline'
                                        }
                                        size={24}
                                        color={themeColor}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <TouchableOpacity
                        style={[
                            styles.doneButton(isDarkMode),
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
    bottomSheetContainer: (isDarkMode: boolean) => ({
        flex: 1,
        padding: 16,
        backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    }),
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
    headerTitle: (isDarkMode: boolean) => ({
        fontSize: 18,
        fontWeight: 'bold',
        color: isDarkMode ? '#fff' : '#000',
        textAlign: 'center',
    }),
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 8,
        marginBottom: 16,
    },
    searchInput: (isDarkMode: boolean) => ({
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#000',
    }),
    createContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    newPlaylistInput: (isDarkMode: boolean) => ({
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#000',
        marginRight: 8,
    }),
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    playlistDetails: {
        marginLeft: 12,
        flex: 1,
    },
    bottomSheetOptionText: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#000',
    }),
    doneButton: (isDarkMode: boolean) => ({
        position: 'absolute',
        bottom: 48,
        left: 48,
        right: 48,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    }),
    doneButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});