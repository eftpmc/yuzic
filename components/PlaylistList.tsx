import React, { useState, forwardRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    useColorScheme,
    Dimensions
} from 'react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import CoverArt from "@/components/CoverArt";

type PlaylistListProps = {
    selectedSong: any;
    playlists: Array<{ id: string; name: string; songCount?: number; duration?: string; cover?: string }>;
    onAddToPlaylist: (playlist: { id: string; name: string }) => void;
    onClose: () => void;
    onCreatePlaylist: (name: string) => void;
};

const PlaylistList = forwardRef<BottomSheet, PlaylistListProps>(
    ({ selectedSong, onClose }, ref) => {
        const colorScheme = useColorScheme();
        const { themeColor } = useSettings();
        const isDarkMode = colorScheme === 'dark';

        const { playlists, addSongToPlaylist, removeSongFromPlaylist, createPlaylist } = usePlaylists();

        const [searchQuery, setSearchQuery] = useState('');
        const [newPlaylistName, setNewPlaylistName] = useState('');
        const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

        useEffect(() => {
            if (selectedSong && playlists) {
                const preSelected = playlists
                    .filter((playlist) =>
                        playlist.songs?.some((song) => song.id === selectedSong.id)
                    )
                    .map((playlist) => playlist.id);
                setSelectedPlaylists(preSelected);
            }
        }, [selectedSong, playlists]);

        const filteredPlaylists = playlists.filter((playlist) =>
            playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const handleCreatePlaylist = async () => {
            if (newPlaylistName.trim()) {
                try {
                    await createPlaylist(newPlaylistName.trim());
                    alert(`Playlist "${newPlaylistName.trim()}" created successfully.`);
                    setNewPlaylistName('');
                } catch (error) {
                    console.error('Error creating playlist:', error);
                    alert('Failed to create the playlist.');
                }
            }
        };

        const togglePlaylistSelection = (id: string) => {
            setSelectedPlaylists((prev) =>
                prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
            );
        };

        const handleDone = async () => {
            if (selectedSong) {
                try {
                    for (const playlist of playlists) {
                        if (selectedPlaylists.includes(playlist.id)) {
                            if (!playlist.songs?.some((song) => song.id === selectedSong.id)) {
                                await addSongToPlaylist(playlist.id, selectedSong);
                            }
                        } else if (playlist.songs?.some((song) => song.id === selectedSong.id)) {
                            const songIndex = playlist.songs.findIndex(
                                (song) => song.id === selectedSong.id
                            );
                            if (songIndex !== -1) {
                                await removeSongFromPlaylist(playlist.id, songIndex);
                            }
                        }
                    }
                    alert(`Song updated in selected playlists.`);
                    ref?.current?.close();
                } catch (error) {
                    console.error('Error updating playlists:', error);
                    alert('Failed to update the playlists.');
                }
            } else {
                alert('No song selected.');
            }
        };

        return (
            <BottomSheet
                ref={ref}
                height={Dimensions.get("screen").height * .8}
                hasDraggableIcon={false}
                sheetBackgroundColor={isDarkMode ? '#222' : '#f9f9f9'}
            >
                <View style={styles.bottomSheetContainer(isDarkMode)}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle(isDarkMode)}>Add to Playlist</Text>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={isDarkMode ? '#fff' : '#888'} />
                        <TextInput
                            style={styles.searchInput(isDarkMode)}
                            placeholder='Search in "Playlists"'
                            placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.createContainer}>
                        <TextInput
                            style={styles.newPlaylistInput(isDarkMode)}
                            placeholder="New playlist name"
                            placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                        />
                        <TouchableOpacity onPress={handleCreatePlaylist}>
                            <Ionicons name="add" size={26
                            } color={isDarkMode ? '#fff' : '#888'} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredPlaylists}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => togglePlaylistSelection(item.id)}
                            >
                                <CoverArt
                                    source={item.cover ?? (item.id === 'favorites' ? 'heart-icon' : null)}
                                    size={50}
                                />
                                <View style={styles.playlistDetails}>
                                    <Text style={styles.bottomSheetOptionText(isDarkMode)}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.playlistMeta(isDarkMode)}>
                                        {item.songs?.length || 0} Songs
                                    </Text>
                                </View>
                                <Ionicons
                                    name={
                                        selectedPlaylists.includes(item.id)
                                            ? 'checkmark-circle'
                                            : 'ellipse-outline'
                                    }
                                    size={24}
                                    color={themeColor}
                                />
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        style={[styles.doneButton(isDarkMode), { backgroundColor: themeColor }]}
                        onPress={handleDone}
                    >
                        <Text style={styles.doneButtonText(isDarkMode)}>Done</Text>
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
    createButton: (isDarkMode: boolean) => ({
        fontSize: 16,
        fontWeight: 'bold',
        color: isDarkMode ? '#fff' : '#000',
    }),
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    playlistCover: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    playlistDetails: {
        marginLeft: 12,
        flex: 1,
    },
    bottomSheetOptionText: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#000',
    }),
    playlistMeta: (isDarkMode: boolean) => ({
        fontSize: 14,
        color: isDarkMode ? '#aaa' : '#666',
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
    doneButtonText: (isDarkMode: boolean) => ({
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    }),
});