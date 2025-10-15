import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    SafeAreaView,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Appearance,
    StyleSheet,
    Animated,
    Easing
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSettings } from "@/contexts/SettingsContext";
import { useDownload } from '@/contexts/DownloadContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { Loader2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import CoverArt from '@/components/CoverArt';
import ConfirmActionSheet from '@/components/ConfirmActionSheet';
import {BottomSheetModal} from '@gorhom/bottom-sheet';

const LibraryView: React.FC = () => {
    const { refreshLibrary, libraryServiceStats, albums } = useLibrary();
    const { playlists } = usePlaylists();
    const { themeColor, audioQuality, setAudioQuality } = useSettings();
    const [isQualityPickerVisible, setIsQualityPickerVisible] = useState(false);

    const {
        getDownloadedSongsCount,
        clearAllDownloads,
        isAlbumDownloaded,
        downloadingIds,
        cancelDownload,
        downloadAllAlbums,
        cancelDownloadAll,
        getFormattedDownloadSize,
        isPlaylistDownloaded,
        markedAlbums,
        markedPlaylists
    } = useDownload();
    const [downloadedSongCount, setDownloadedSongCount] = useState<number>(0);
    const [checkingDownloads, setCheckingDownloads] = useState(true);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const confirmSheetRef = useRef<BottomSheetModal>(null);
    const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const servicesAreReady = useMemo(() => {
        const services = Object.values(libraryServiceStats);
        if (services.length === 0) return false;
        return services.every((stat: any) => stat.status === 'success');
    }, [libraryServiceStats]);

    const handleRefreshLibrary = async () => {
        setIsLoading(true);
        try {
            await refreshLibrary();
            alert('Library refreshed successfully.');
        } catch (error) {
            alert('Failed to refresh library.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchDownloads = async () => {
            setCheckingDownloads(true);
            const count = await getDownloadedSongsCount();
            setDownloadedSongCount(count);
            setCheckingDownloads(false);
        };
        fetchDownloads();
    }, [getDownloadedSongsCount]);

    const spinValue = useMemo(() => new Animated.Value(0), []);

    useMemo(() => {
        if (isLoading) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.stopAnimation();
        }
    }, [isLoading]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleClearDownloads = async () => {
        await clearAllDownloads();
        setDownloadedSongCount(0);
        alert('All downloaded songs have been cleared.');
    };

    const showConfirm = (action: () => void, message: string) => {
        setPendingAction(() => () => action());
        setConfirmMessage(message);
        confirmSheetRef.current?.present();
      };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Library
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Library Stats */}
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                            Services
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                showConfirm(
                                    handleRefreshLibrary,
                                    'This will re-fetch all music data from your connected server and additional sites. Continue?'
                                )
                            }
                            disabled={isLoading || !servicesAreReady}
                            style={[
                                styles.miniRefreshButton,
                                {
                                    backgroundColor: (isLoading || !servicesAreReady) ? themeColor + '99' : themeColor,
                                    opacity: (isLoading || !servicesAreReady) ? 0.6 : 1,
                                },
                            ]}
                        >
                            {isLoading ? (
                                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                    <Loader2 size={16} color="#fff" />
                                </Animated.View>
                            ) : (
                                <MaterialIcons name="refresh" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {Object.entries(libraryServiceStats).map(([key, stat]: any, index) => {
                        const fetched = stat.meta?.fetched ?? 0;
                        const total = stat.meta?.total ?? 0;
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        const statusLabel = fetched > 0
                            ? `Fetched ${fetched}/${total}`
                            : `Up to date (${total})`;

                        return (
                            <View key={key}>
                                {index !== 0 && <View style={[styles.divider, isDarkMode && styles.dividerDark]} />}
                                <View style={styles.row}>
                                    <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                        {label}
                                    </Text>
                                    <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
                                        {statusLabel}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {!servicesAreReady && !isLoading && (
                        <Text style={[styles.tooltipText, isDarkMode && styles.tooltipTextDark]}>
                            Wait for all services to finish before refreshing.
                        </Text>
                    )}
                </View>

                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                        Set your preferred audio quality for offline downloads.
                    </Text>

                    <TouchableOpacity
                        style={[styles.optionButton, isDarkMode && styles.optionButtonDark]}
                        onPress={() => setIsQualityPickerVisible(!isQualityPickerVisible)}
                    >
                        <View style={styles.leftGroup}>
                            <MaterialIcons name="graphic-eq" size={20} color={isDarkMode ? '#ccc' : '#666'} style={{ marginRight: 12 }} />
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                Audio Quality: {audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)}
                            </Text>
                        </View>
                        <MaterialIcons
                            name={isQualityPickerVisible ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={isDarkMode ? '#ccc' : '#666'}
                        />
                    </TouchableOpacity>

                    {isQualityPickerVisible && (
                        <View style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden' }}>
                            {isQualityPickerVisible && (
                                <View style={{ marginTop: 12 }}>
                                    {['low', 'medium', 'high', 'original'].map((quality) => (
                                        <TouchableOpacity
                                            key={quality}
                                            onPress={() => {
                                                setAudioQuality(quality);
                                                setIsQualityPickerVisible(false);
                                            }}
                                            style={[
                                                {
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 14,
                                                    borderRadius: 6,
                                                    marginBottom: 6,
                                                    backgroundColor:
                                                        audioQuality === quality
                                                            ? themeColor
                                                            : isDarkMode
                                                                ? '#1a1a1a'
                                                                : '#f1f1f1',
                                                    borderWidth: 1,
                                                    borderColor:
                                                        audioQuality === quality
                                                            ? themeColor
                                                            : isDarkMode
                                                                ? '#333'
                                                                : '#ddd',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        audioQuality === quality
                                                            ? '#fff'
                                                            : isDarkMode
                                                                ? '#ccc'
                                                                : '#333',
                                                    fontWeight: audioQuality === quality ? '600' : '400',
                                                }}
                                            >
                                                {quality === 'low'
                                                    ? 'Low (64kbps)'
                                                    : quality === 'medium'
                                                        ? 'Medium (128kbps)'
                                                        : quality === 'high'
                                                            ? 'High (192kbps)'
                                                            : 'Original (no compression)'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Downloads Section */}
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                            Downloads
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={
                                    downloadingIds.length > 0
                                        ? cancelDownloadAll
                                        : () => downloadAllAlbums(albums)
                                }
                                style={[
                                    styles.clearButton,
                                    {
                                        backgroundColor: themeColor,
                                        opacity: albums.length === 0 ? 0.6 : 1,
                                    },
                                ]}
                                disabled={albums.length === 0}
                            >
                                <MaterialIcons
                                    name={downloadingIds.length > 0 ? 'cancel' : 'file-download'}
                                    size={18}
                                    color="#fff"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => showConfirm(handleClearDownloads, 'This will remove all downloaded songs from your device.')}
                                style={[
                                    styles.clearButton,
                                    {
                                        backgroundColor: themeColor,
                                        opacity: downloadedSongCount === 0 ? 0.6 : 1,
                                    },
                                ]}
                                disabled={downloadedSongCount === 0}
                            >
                                <MaterialIcons name="delete" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginTop: 8, gap: 12 }}>
                    {[...albums, ...playlists]
                        .filter(item =>
                        (item.songs?.length ?? 0) > 0 &&
                        (markedAlbums.has(item.id) || markedPlaylists.has(item.id))
                        )
                        .map(item => {
                        const isAlbum = 'artist' in item;
                        const isDownloaded = isAlbum
                            ? isAlbumDownloaded(item)
                            : isPlaylistDownloaded(item);
                        const isDownloading = downloadingIds.includes(item.id);
                        const isIncomplete = !isDownloaded && !isDownloading;

                        const statusLabel = isDownloaded
                            ? 'Downloaded'
                            : isDownloading
                            ? 'Downloading'
                            : 'Incomplete';

                        const statusColor = isDownloaded
                            ? '#22c55e' // green
                            : isDownloading
                            ? themeColor
                            : '#f97316'; // orange

                        return (
                            <View key={item.id} style={[styles.downloadItemCard, isDarkMode && styles.downloadItemCardDark]}>
                            <CoverArt source={item.cover} size={48} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.downloadItemTitle, isDarkMode && styles.downloadItemTitleDark]}>
                                {item.title}
                                </Text>
                                <Text style={[styles.downloadItemSub, isDarkMode && styles.downloadItemSubDark]}>
                                {isAlbum ? 'Album' : 'Playlist'} • {item.songs.length} songs
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                                style={[
                                styles.statusBadge,
                                { backgroundColor: statusColor + '22', borderColor: statusColor },
                                ]}
                            >
                                <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>
                                {statusLabel}
                                </Text>
                            </View>

                            {isDownloading && (
                                <TouchableOpacity onPress={() => cancelDownload(item.id)}>
                                <MaterialIcons name="cancel" size={18} color={statusColor} />
                                </TouchableOpacity>
                            )}
                            </View>
                            </View>
                        );
                        })}
                    </View>
                    <View style={styles.row}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            Download Size
                        </Text>
                        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
                            {getFormattedDownloadSize()}
                        </Text>
                    </View>

                    {downloadedSongCount > 0 && (
                        <Text style={[styles.tooltipText, isDarkMode && styles.tooltipTextDark]}>
                            These songs are stored locally for offline playback.
                        </Text>
                    )}
                </View>
            </ScrollView>
            <ConfirmActionSheet
                ref={confirmSheetRef}
                title="Are you sure?"
                description={confirmMessage}
                themeColor={themeColor}
                onConfirm={() => {
                pendingAction?.();
                confirmSheetRef.current?.dismiss();
                }}
                onCancel={() => confirmSheetRef.current?.dismiss()}
            />
        </SafeAreaView>
    );
};

export default LibraryView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
    headerDark: { backgroundColor: '#000', borderBottomColor: '#222' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'center' },
    headerTitleDark: { color: '#fff' },
    downloadItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f7f7f7',
        borderWidth: 1,
        borderColor: '#ddd',
      },
      downloadItemCardDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
      },
      statusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      },
      downloadItemSub: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
      },
      downloadItemSubDark: {
        color: '#aaa',
      },
      downloadItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#eee',
      },
      downloadItemRowDark: {
        borderColor: '#333',
      },
      downloadItemTitle: {
        fontSize: 14,
        color: '#444',
      },
      downloadItemTitleDark: {
        color: '#ccc',
      },      
    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: {
        color: '#aaa',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f1f1',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    optionButtonDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { marginBottom: 24 },
    sectionDark: { backgroundColor: '#111', paddingVertical: 20, paddingHorizontal: 16, borderRadius: 10 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    sectionTitleDark: {
        color: '#fff',
    },

    tooltipText: {
        marginTop: 10,
        fontSize: 12,
        color: '#888',
    },
    tooltipTextDark: {
        color: '#aaa',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    rowValue: { fontSize: 14, color: '#666' },
    rowValueDark: { color: '#aaa' },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 4,
    },
    dividerDark: {
        backgroundColor: '#333',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 2,
        marginTop: 10,
    },
    refreshButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007BFF',
    },
    refreshButtonTextDark: {
        color: '#fff',
    },
    miniRefreshButton: {
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    clearButton: {
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    downloadingContainer: {
        marginTop: 12,
        paddingTop: 4,
        borderTopWidth: 1,
        borderColor: '#444',
    },
    downloadingTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    downloadingTitleDark: {
        color: '#ccc',
    },
    downloadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    downloadingText: {
        fontSize: 14,
        color: '#444',
    },
    downloadingTextDark: {
        color: '#ccc',
    },
});