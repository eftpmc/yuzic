import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    useColorScheme,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import SongOptions from '@/components/options/SongOptions';
import ThemedHeartCover from "@/components/ThemedHeartCover";
import { SafeAreaView } from 'react-native-safe-area-context';
import DownloadOptions from '@/components/options/DownloadOptions';
import { useDownload } from '@/contexts/DownloadContext';

const PlaylistView: React.FC = () => {
    const route = useRoute();
    const { themeColor } = useSettings();
    const navigation = useNavigation();
    const { playlists } = usePlaylists(); // Access playlists from the LibraryContext
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { playSongInCollection } = usePlaying();
    const {
        downloadPlaylist,
        isPlaylistDownloaded,
        isDownloadingPlaylist
    } = useDownload();

    const bottomSheetRef = useRef(null);
    const [selectedSong, setSelectedSong] = useState(null);

    const { id } = route.params as { id: string };
    const playlist = playlists.find((playlist) => playlist.id === id); // Find playlist by id

    if (!playlist) {
        return (
            <View style={styles.screenContainer(isDarkMode)}>
                <Text style={styles.errorText(isDarkMode)}>Playlist not found.</Text>
            </View>
        );
    }

    const formatDuration = (duration: string) => {
        const minutes = Math.floor(Number(duration) / 60);
        const seconds = Number(duration) % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const calculateTotalDuration = (songs: any[]) => {
        const totalDuration = songs.reduce((total, song) => total + Number(song.duration), 0);
        return formatDuration(totalDuration.toString());
    };

    const openBottomSheet = (song: any) => {
        setSelectedSong(song);
        bottomSheetRef.current?.show();
    };

    return (
        <SafeAreaView
            edges={['top']}
            style={styles.screenContainer(isDarkMode)}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <View style={styles.headerButton}>
                        <DownloadOptions
                            onDownload={async () => {
                                try {
                                    await downloadPlaylist(playlist);
                                } catch (e) {
                                    console.log(e);
                                }
                            }}
                            isDownloaded={isPlaylistDownloaded(playlist)}
                            isLoading={isDownloadingPlaylist(playlist.id)}
                        />
                    </View>
                </View>

                {playlist.id === 'favorite' ? (
                    <View style={styles.coverArtWrapper}>
                        <ThemedHeartCover size={280} rounded={16}/>
                    </View>
                ) : (
                    playlist.cover && (
                        <Image source={{ uri: playlist.cover }} style={styles.coverArt} />
                    )
                )}

                <View style={styles.titleRow}>
                    <View style={styles.titleDurationContainer}>
                        <Text style={styles.title(isDarkMode)}>{playlist.title}</Text>
                        <Text style={styles.subtext(isDarkMode)}>
                            {playlist.songs?.length || 0} songs · {calculateTotalDuration(playlist.songs || [])}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: themeColor }]}
                        onPress={() => playSongInCollection(playlist.songs[0], playlist)}
                    >
                        <Ionicons name="play" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.songsListContainer}>
                    {playlist.songs?.map((song) => (
                        <View key={song.id} style={styles.songRow}>
                            <TouchableOpacity
                                style={styles.songInfo}
                                onPress={() => playSongInCollection(song, playlist)}
                            >
                                <Image
                                    source={{ uri: song.cover || 'https://via.placeholder.com/100' }}
                                    style={styles.songCoverArt}
                                />
                                <View style={styles.songDetails}>
                                    <Text style={styles.songTitle(isDarkMode)}>{song.title}</Text>
                                    <Text style={styles.songDuration(isDarkMode)}>
                                        {song.artist || 'Unknown'} • {formatDuration(song.duration)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <SongOptions selectedSongId={song.id} />
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PlaylistView;

const styles = StyleSheet.create({
    screenContainer: (isDarkMode: boolean) => ({
        flex: 1,
        backgroundColor: isDarkMode ? '#000' : '#fff',
    }),
    container: {
        paddingTop: 60,
        padding: 16,
        alignItems: 'center',
    },
    coverArt: {
        width: 280,
        height: 280,
        borderRadius: 16,
        marginTop: 32,
        marginBottom: 24,
    },
    headerRow: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerButton: {
        padding: 6,
    },
    titleDurationContainer: {
        alignSelf: 'flex-start',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 8,
        marginBottom: 12,
    },
    title: (isDarkMode: boolean) => ({
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'flex-start',
        color: isDarkMode ? '#fff' : '#000',
        lineHeight: 30,
    }),
    subtext: (isDarkMode: boolean) => ({
        fontSize: 14,
        color: isDarkMode ? '#aaa' : '#666',
        marginTop: 4,
    }),
    coverArtWrapper: {
        marginTop: 32,
        marginBottom: 24,
    },
    playButton: {
        marginHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
        width: 48,
        height: 48,
    },
    songsListContainer: {
        width: '100%',
        marginTop: 8,
        marginBottom: 100,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    songInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    songCoverArt: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 12,
    },
    songDetails: {
        flex: 1,
    },
    songTitle: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#333',
    }),
    songDuration: (isDarkMode: boolean) => ({
        fontSize: 14,
        color: isDarkMode ? '#aaa' : '#666',
    }),
    moreButton: {
        paddingHorizontal: 8,
    },
    errorText: (isDarkMode: boolean) => ({
        color: isDarkMode ? '#fff' : '#000',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    }),
});