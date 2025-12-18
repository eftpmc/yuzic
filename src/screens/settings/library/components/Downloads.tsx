import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CoverArt from '@/components/CoverArt';
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector } from 'react-redux';
import {
    selectAlbumList,
    selectPlaylistList,
} from '@/utils/redux/librarySelectors';
import { useSettings } from '@/contexts/SettingsContext';

type DownloadsProps = {
    onConfirm: (action: () => void, message: string) => void;
};

const Downloads: React.FC<DownloadsProps> = ({ onConfirm }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const { themeColor } = useSettings();

    const {
        getDownloadedSongsCount,
        clearAllDownloads,
        isAlbumDownloaded,
        isPlaylistDownloaded,
        isDownloadingAlbum,
        isDownloadingPlaylist,
        cancelDownload,
        getFormattedDownloadSize,
        markedAlbums,
        markedPlaylists,
    } = useDownload();

    const albums = useSelector(selectAlbumList);
    const playlists = useSelector(selectPlaylistList);

    const [downloadedSongCount, setDownloadedSongCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            const count = await getDownloadedSongsCount();
            setDownloadedSongCount(count);
        };
        load();
    }, [getDownloadedSongsCount]);

    const items = useMemo(() => {
        const albumItems = albums
            .filter(a => markedAlbums.has(a.id))
            .map(a => ({ ...a, type: 'album' as const }));

        const playlistItems = playlists
            .filter(p => markedPlaylists.has(p.id))
            .map(p => ({ ...p, type: 'playlist' as const }));

        return [...albumItems, ...playlistItems];
    }, [albums, playlists, markedAlbums, markedPlaylists]);

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                    Downloads
                </Text>

                <TouchableOpacity
                    onPress={() =>
                        onConfirm(
                            clearAllDownloads,
                            'This will remove all downloaded songs from your device.'
                        )
                    }
                    disabled={downloadedSongCount === 0}
                    style={[
                        styles.iconButton,
                        {
                            backgroundColor: themeColor,
                            opacity: downloadedSongCount === 0 ? 0.5 : 1,
                        },
                    ]}
                >
                    <MaterialIcons name="delete" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.list}>
                {items.map(item => {
                    const downloaded =
                        item.type === 'album'
                            ? isAlbumDownloaded(item.id)
                            : isPlaylistDownloaded(item.id);

                    const downloading =
                        item.type === 'album'
                            ? isDownloadingAlbum(item.id)
                            : isDownloadingPlaylist(item.id);

                    const statusLabel = downloaded
                        ? 'Downloaded'
                        : downloading
                            ? 'Downloading'
                            : 'Incomplete';

                    const statusColor = downloaded
                        ? '#22c55e'
                        : downloading
                            ? themeColor
                            : '#f97316';

                    return (
                        <View
                            key={item.id}
                            style={[
                                styles.card,
                                isDarkMode && styles.cardDark,
                            ]}
                        >
                            <CoverArt source={item.cover} size={48} />

                            <View style={styles.cardInfo}>
                                <Text
                                    style={[
                                        styles.cardTitle,
                                        isDarkMode && styles.cardTitleDark,
                                    ]}
                                >
                                    {item.title}
                                </Text>
                                <Text
                                    style={[
                                        styles.cardSub,
                                        isDarkMode && styles.cardSubDark,
                                    ]}
                                >
                                    {item.type === 'album' ? 'Album' : 'Playlist'}
                                </Text>
                            </View>

                            <View style={styles.cardActions}>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: statusColor + '22',
                                            borderColor: statusColor,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color: statusColor,
                                            fontSize: 12,
                                            fontWeight: '600',
                                        }}
                                    >
                                        {statusLabel}
                                    </Text>
                                </View>

                                {downloading && (
                                    <TouchableOpacity
                                        onPress={() => cancelDownload(item.id)}
                                    >
                                        <MaterialIcons
                                            name="cancel"
                                            size={18}
                                            color={statusColor}
                                        />
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
                <Text style={[styles.note, isDarkMode && styles.noteDark]}>
                    These songs are stored locally for offline playback.
                </Text>
            )}
        </View>
    );
};

export default Downloads;

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#f7f7f7',
    },
    sectionDark: {
        backgroundColor: '#111',
    },
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
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        marginTop: 8,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f7f7f7',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cardDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 14,
        color: '#444',
    },
    cardTitleDark: {
        color: '#ccc',
    },
    cardSub: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    cardSubDark: {
        color: '#aaa',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    rowText: {
        fontSize: 16,
        color: '#000',
    },
    rowTextDark: {
        color: '#fff',
    },
    rowValue: {
        fontSize: 14,
        color: '#666',
    },
    rowValueDark: {
        color: '#aaa',
    },
    note: {
        marginTop: 10,
        fontSize: 12,
        color: '#888',
    },
    noteDark: {
        color: '#aaa',
    },
});