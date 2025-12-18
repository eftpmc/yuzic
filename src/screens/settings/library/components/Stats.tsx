import React, { useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { useLibrary } from '@/contexts/LibraryContext';
import { selectAlbumList, selectArtistList, selectPlaylistList } from '@/utils/redux/librarySelectors';
import { useSelector } from 'react-redux';
import { useSettings } from '@/contexts/SettingsContext';

type StatsProps = {
    onConfirm: (action: () => void, message: string) => void;
};

const Stats: React.FC<StatsProps> = ({
    onConfirm,
}) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const { themeColor } = useSettings();
    const { refreshLibrary, isLoading } = useLibrary();
    const albums = useSelector(selectAlbumList);
    const artists = useSelector(selectArtistList);
    const playlists = useSelector(selectPlaylistList);

    const stats = useMemo(() => {
        const total = albums.length + artists.length + playlists.length;

        return {
            library: {
                label: 'Library',
                fetched: total,
                total,
            },
        };
    }, [albums, artists, playlists]);

    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isLoading) {
            spinValue.stopAnimation();
            spinValue.setValue(0);
            return;
        }

        const loop = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        loop.start();

        return () => {
            loop.stop();
        };
    }, [isLoading]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleRefresh = () => {
        onConfirm(
            async () => {
                await refreshLibrary();
            },
            'This will re-fetch all music data from your connected server and additional sources. Continue?'
        );
    };

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                    Services
                </Text>

                <TouchableOpacity
                    onPress={handleRefresh}
                    disabled={isLoading}
                    style={[
                        styles.refreshButton,
                        {
                            backgroundColor: themeColor,
                            opacity: isLoading ? 0.6 : 1,
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

            {Object.entries(stats).map(([key, stat], index) => {
                const label = stat.label;
                const fetched = stat.fetched;
                const total = stat.total;

                const statusLabel =
                    fetched > 0
                        ? `Fetched ${fetched}/${total}`
                        : `Up to date (${total})`;

                return (
                    <View key={key}>
                        {index !== 0 && (
                            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
                        )}
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
        </View>
    );
};

export default Stats;

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
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
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
    divider: {
        height: 1,
        backgroundColor: '#e5e5e5',
    },
    dividerDark: {
        backgroundColor: '#333',
    },
});