import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import CoverArt from '@/components/CoverArt';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { AlbumData } from '@/types'
import DownloadOptions from '@/components/options/DownloadOptions';
import SongOptions from '@/components/options/SongOptions';
import { FlashList } from '@shopify/flash-list';
import { useApi } from '@/api';
import Loader from '@/components/Loader';

const AlbumView: React.FC = () => {
    const route = useRoute();
    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';
    const { themeColor } = useSettings();
    const api = useApi();
    const { playSongInCollection } = usePlaying();
    const {
        isAlbumDownloaded,
        isDownloadingAlbum,
        downloadAlbum
    } = useDownload();

    const { id } = route.params;

    useEffect(() => {
        const getAlbum = async () => {
            try {
                setIsLoading(true);
                const collection = await api.albums.get(id);
                if (!collection) {
                    throw new Error(`getAlbum error`);
                }
                setAlbum(collection);
            } catch {
                throw new Error('getAlbum error')
            } finally {
                setIsLoading(false);
            }
        };

        getAlbum();
    }, [id]);

    const songs = album?.songs || [];

    const totalDuration = useMemo(() => {
        return songs.reduce((sum, song) => sum + Number(song.duration), 0);
    }, [songs]);

    if (isLoading) {
        return (
            <View style={{ flex: 1 }}>
                <Loader />
            </View>
        );
    }

    if (!album) {
        return (
            <View style={[styles.container, isDarkMode && styles.containerDark]}>
                <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
                    Album not found.
                </Text>
            </View>
        );
    }

    const isDownloaded = isAlbumDownloaded(album);

    const isDownloading = isDownloadingAlbum(album.id);

    const handleDownload = async () => {
        await downloadAlbum(album);
    };

    const formatDuration = (duration: number) => {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
                .toString()
                .padStart(2, '0')}`;
        }

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView edges={['top']} style={styles.screenContainer(isDarkMode)}>
            <FlashList
                data={songs}
                estimatedItemSize={72}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View key={item.id} style={styles.songRow}>
                        <TouchableOpacity
                            style={styles.songInfo}
                            onPress={() => playSongInCollection(item, album)}
                        >
                            <Image source={{ uri: item.cover }} style={styles.songCoverArt} />
                            <View>
                                <Text style={styles.songTitle(isDarkMode)}>{item.title}</Text>
                                <Text style={styles.songSubtitle(isDarkMode)}>
                                    {item.artist || 'Unknown'} • {formatDuration(Number(item.duration))}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <SongOptions selectedSongId={item.id} />
                    </View>
                )}
                ListHeaderComponent={() => (
                    <View style={styles.container}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                                <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                            </TouchableOpacity>
                            <DownloadOptions
                                onDownload={handleDownload}
                                isDownloaded={isDownloaded}
                                isLoading={isDownloading}
                            />
                        </View>

                        <View style={styles.coverWrapper}>
                            <CoverArt
                                source={album.cover ?? null}
                                size={280}
                                isGrid={true}
                            />
                        </View>

                        <View style={styles.titleRow}>
                            <View style={styles.titleInfo}>
                                <Text style={styles.title(isDarkMode)} numberOfLines={1}>
                                    {album.title}
                                </Text>

                                {album.artist && (
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('artistView', { id: album.artist.id })}
                                        style={styles.artistRow}
                                    >
                                        {album.artist.cover ? (
                                            <Image source={{ uri: album.artist.cover }} style={styles.artistImage} />
                                        ) : (
                                            <Ionicons name="person-circle-outline" size={20} color={isDarkMode ? '#fff' : '#ccc'} />
                                        )}
                                        <Text style={styles.artistName(isDarkMode)} numberOfLines={1}>
                                            {album.artist.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={styles.subtext(isDarkMode)}>
                                    {songs.length} songs · {formatDuration(totalDuration)}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.playButton, { backgroundColor: themeColor }]}
                                onPress={() => playSongInCollection(songs[0], album)}
                            >
                                <Ionicons name="play" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

export default AlbumView;

const styles = StyleSheet.create({
    screenContainer: (isDark: boolean) => ({
        flex: 1,
        backgroundColor: isDark ? '#000' : '#fff',
    }),
    container: {
        paddingTop: 60,
        padding: 16,
        alignItems: 'center',
    },
    errorText: (isDark: boolean) => ({
        color: isDark ? '#fff' : '#000',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    }),
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
    coverWrapper: {
        width: 280,
        height: 280,
        borderRadius: 16,
        marginTop: 32,
        marginBottom: 24,
        overflow: 'hidden',
    },
    coverArt: {
        width: 280,
        height: 280,
        borderRadius: 16,
        marginTop: 32,
        marginBottom: 24,
    },
    coverArtPlaceholder: (isDark: boolean) => ({
        width: 200,
        height: 200,
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: isDark ? '#444' : '#f5f5f5',
    }),
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 8,
        marginBottom: 12,
    },
    titleInfo: {
        flex: 1,
        paddingRight: 12,
    },
    title: (isDark: boolean) => ({
        fontSize: 24,
        fontWeight: 'bold',
        color: isDark ? '#fff' : '#000',
        marginBottom: 4,
    }),
    subtext: (isDark: boolean) => ({
        fontSize: 14,
        color: isDark ? '#aaa' : '#666',
    }),
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    artistImage: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
    },
    artistName: (isDark: boolean) => ({
        fontSize: 14,
        color: isDark ? '#fff' : '#333',
    }),
    playButton: {
        borderRadius: 24,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
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
        paddingVertical: 10,
        paddingHorizontal: 16,
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
    songTitle: (isDark: boolean) => ({
        fontSize: 16,
        fontWeight: '400',
        color: isDark ? '#fff' : '#000',
    }),
    songSubtitle: (isDark: boolean) => ({
        fontSize: 14,
        color: isDark ? '#aaa' : '#666',
    }),
});