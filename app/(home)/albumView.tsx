import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    useColorScheme,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DownloadOptions from '@/components/options/DownloadOptions';
import { Ionicons } from '@expo/vector-icons';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useLibrary } from '@/contexts/LibraryContext';
import SongOptions from '@/components/options/SongOptions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const AlbumView: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { themeColor } = useSettings();
    const { isAlbumDownloaded, downloadAlbum, isDownloadingAlbum } = useDownload();
    const { playSongInCollection } = usePlaying();
    const { albums } = useLibrary(); // Access albums from context
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const [selectedSong, setSelectedSong] = useState(null);
    const menuRef = useRef(null);

    const { id } = route.params as { id: string };
    const album = albums.find((album) => album.id === id); // Find the album by id

    if (!album) {
        return (
            <View style={styles.screenContainer(isDarkMode)}>
                <Text style={styles.errorText(isDarkMode)}>Album not found.</Text>
            </View>
        );
    }

    const formatPlayCount = (count: number): string => {
        if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
        if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
        return count.toString();
    };

    const formatDuration = (duration: string) => {
        const minutes = Math.floor(Number(duration) / 60);
        const seconds = Number(duration) % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const openBottomSheet = (song: any) => {
        setSelectedSong(song);
        bottomSheetRef.current?.show();
    };

    const navigateToArtist = () => {
        if (album.artist) {
            navigation.navigate("artistView", {
                id: album.artist.id
            });
        }
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
                                    await downloadAlbum(album);
                                } catch (e) {
                                    console.log(e);
                                }
                            }}
                            isDownloaded={isAlbumDownloaded(album)}
                            isLoading={isDownloadingAlbum(album.id)}
                        />
                    </View>
                </View>

                {album.cover ? (
                    <Image source={{ uri: album.cover }} style={styles.coverArt} />
                ) : (
                    <Ionicons
                        name="musical-notes-outline"
                        size={120}
                        color={isDarkMode ? '#666' : '#ccc'}
                        style={styles.coverArtPlaceholder(isDarkMode)}
                    />
                )}

                <View style={styles.titleRow}>
                    <View style={styles.titleArtistContainer}>
                        <Text style={styles.title(isDarkMode)} numberOfLines={1}>{album.title}</Text>
                        {album.artist && (
                            <TouchableOpacity onPress={navigateToArtist} style={styles.artistContainer}>
                                {album.artist.cover ? (
                                    <Image source={{ uri: album.artist.cover }} style={styles.artistImage} />
                                ) : (
                                    <Ionicons name="person-circle-outline" size={40} color={isDarkMode ? '#fff' : '#ccc'} />
                                )}
                                <Text style={styles.artistName(isDarkMode)}>{album.artist.name}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={[styles.playButton, { backgroundColor: themeColor }]} onPress={() => playSongInCollection(album.songs[0], album)}>
                        <Ionicons name="play" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.songsListContainer}>
                    {album.songs.map((song, index) => (
                        <View key={song.id} style={styles.songRow}>
                            <TouchableOpacity style={styles.songInfo} onPress={() => playSongInCollection(song, album)}>
                                <Text style={styles.songNumber(isDarkMode)}>{index + 1}</Text>
                                <View style={styles.songDetails}>
                                    <View style={styles.songTitleContainer}>
                                        <Text style={styles.songTitle(isDarkMode)}>{song.title}</Text>
                                        <Text style={styles.songArtist(isDarkMode)}>
                                            {album.artist.name || 'Unknown'} • {formatDuration(song.duration)} • {formatPlayCount(song.globalPlayCount ?? 0)} plays
                                        </Text>
                                    </View>
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

export default AlbumView;

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
    errorText: (isDarkMode: boolean) => ({
        color: isDarkMode ? '#fff' : '#000',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    }),
    coverArt: {
        width: 280,
        height: 280,
        borderRadius: 16,
        marginTop: 32,
        marginBottom: 24,
    },
    coverArtPlaceholder: (isDarkMode: boolean) => ({
        width: 200,
        height: 200,
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: isDarkMode ? '#444' : '#f5f5f5',
    }),
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 8,
        marginBottom: 12,
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
    title: (isDarkMode: boolean) => ({
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'flex-start',
        marginBottom: 8,
        color: isDarkMode ? '#fff' : '#000',
        numberOfLines: 1,
    }),
    artistContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    artistImage: {
        width: 30,
        height: 30,
        borderRadius: 20,
        marginRight: 8,
    },
    artistName: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#333',
        fontWeight: 'bold',
    }),
    titleArtistContainer: {
        flex: 1,
        paddingRight: 12,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        marginVertical: 8,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    songInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    songNumber: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#aaa' : '#666',
        textAlign: 'center',
        marginRight: 8,
        width: 24,
    }),
    songDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    songTitleContainer: {
        flex: 1,
    },
    songTitle: (isDarkMode: boolean) => ({
        fontSize: 16,
        color: isDarkMode ? '#fff' : '#333',
    }),
    songArtist: (isDarkMode: boolean) => ({
        fontSize: 14,
        color: isDarkMode ? '#aaa' : '#666',
    }),
});