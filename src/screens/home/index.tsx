import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    Easing
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appearance, VirtualizedList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { usePlaying } from '@/contexts/PlayingContext';
import Item from "@/components/home/Item";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AccountActionSheet from '@/components/AccountActionSheet';
import Loader from '@/components/Loader'
import { RootState } from '@/utils/redux/store';
import { useSelector } from 'react-redux';

const isColorLight = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 128;
};

export default function HomeScreen() {
    const navigation = useNavigation();
    const router = useRouter();
    const { isAuthenticated, username } = useSelector((s: RootState) => s.server);
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { albums = [], artists = [], playlists = [], fetchLibrary, clearLibrary, isLoading } = useLibrary();
    const { themeColor, gridColumns } = useSettings();
    const { currentSong, playSongInCollection, pauseSong, resetQueue } = usePlaying();

    const [activeFilter, setActiveFilter] = useState<'all' | 'albums' | 'artists' | 'playlists'>('all');
    const [isGridView, setIsGridView] = useState(true);
    const [sortOrder, setSortOrder] = useState<'title' | 'recent' | 'userplays'>('title');

    const bottomSheetRef = useRef<BottomSheet>(null);
    const accountSheetRef = useRef<BottomSheet>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        if (!isAuthenticated) {
            router.replace('/(onboarding)');
        }
    }, [isMounted, isAuthenticated]);


    useEffect(() => {
        if (isAuthenticated) {
            fetchLibrary();
        } else {
            clearLibrary();
        }
    }, [fetchLibrary]);

    useEffect(() => {
        const onChange = ({ window }: { window: { width: number } }) => {
            setScreenWidth(window.width);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove?.();
    }, []);

    const allData = useMemo(() => [
        ...albums.map((item) => ({ ...item, type: 'Album' })),
        ...artists.map((item) => ({ ...item, type: 'Artist' })),
        ...playlists.map((item) => ({ ...item, type: 'Playlist' })),
    ], [albums, artists, playlists]);

    const sortedFilteredData = useMemo(() => {
        let data = [];

        switch (activeFilter) {
            case 'albums':
                data = albums.map((item) => ({ ...item, type: 'Album' }));
                break;
            case 'artists':
                data = artists.map((item) => ({ ...item, type: 'Artist' }));
                break;
            case 'playlists':
                data = playlists.map((item) => ({ ...item, type: 'Playlist' }));
                break;
            default:
                data = allData;
                break;
        }

        if (sortOrder === 'title') {
            return [...data].sort((a, b) => {
                const titleA = a.title ?? a.name ?? '';
                const titleB = b.title ?? b.name ?? '';
                return titleA.localeCompare(titleB);
            });
        } else if (sortOrder === 'recent') {
            return [...data].reverse(); // Assuming latest are last in the array
        } else if (sortOrder === 'userplays') {
            return [...data].sort((a, b) => (b.userPlayCount || 0) - (a.userPlayCount || 0));
        }

        return data;
    }, [albums, artists, playlists, activeFilter, sortOrder]);

    useEffect(() => {
        const loadSortOrder = async () => {
            try {
                const storedSort = await AsyncStorage.getItem('librarySortOrder');
                if (storedSort === 'title' || storedSort === 'recent' || storedSort === 'userplays') {
                    setSortOrder(storedSort);
                }
            } catch (err) {
                console.warn('Failed to load sortOrder:', err);
            }
        };

        loadSortOrder();
    }, []);

    const filters = [
        { label: 'All', value: 'all' },
        { label: 'Albums', value: 'albums' },
        { label: 'Artists', value: 'artists' },
        { label: 'Playlists', value: 'playlists' },
    ];

    const sortOptions = [
        { value: 'title', label: 'Alphabetical', icon: 'text-outline' },
        { value: 'recent', label: 'Most Recent', icon: 'time-outline' },
        { value: 'userplays', label: 'Most Played', icon: 'flame-outline' },
    ];

    const currentSortLabel = sortOptions.find(option => option.value === sortOrder)?.label || 'Sort';

    const handleItemPress = (item) => {
        if (item.type === 'Album') {
            navigation.navigate('albumView', { id: item.id });
        } else if (item.type === 'Playlist') {
            navigation.navigate('playlistView', { id: item.id });
        } else if (item.type === 'Artist') {
            navigation.navigate('artistView', { id: item.id });
        }
    };

    const renderItem = ({ item }) => {
        const isCurrentlyPlaying = () => {
            if (!currentSong) return false;

            if (item.type === 'Album') {
                return albums.find((a) => a.id === item.id)?.songs?.some((s) => s.id === currentSong.id);
            }

            if (item.type === 'Playlist') {
                return playlists.find((p) => p.id === item.id)?.songs?.some((s) => s.id === currentSong.id);
            }

            return false;
        };

        const handlePlay = () => {
            if (item.type === 'Album') {
                const album = albums.find((a) => a.id === item.id);
                const firstSong = album?.songs?.[0];
                if (album && firstSong) {
                    playSongInCollection(firstSong, {
                        id: album.id,
                        title: album.title,
                        artist: album.artist,
                        cover: album.cover,
                        songs: album.songs,
                        type: 'album',
                    });
                }
            } else if (item.type === 'Playlist') {
                const playlist = playlists.find((p) => p.id === item.id);
                const firstSong = playlist?.songs?.[0];
                if (playlist && firstSong) {
                    playSongInCollection(firstSong, {
                        id: playlist.id,
                        title: playlist.title,
                        cover: playlist.cover,
                        songs: playlist.songs,
                        type: 'playlist',
                    });
                }
            }
        };

        return (
            <Item
                item={item}
                isGridView={isGridView}
                isDarkMode={isDarkMode}
                isCurrentlyPlaying={isCurrentlyPlaying()}
                onPress={() => handleItemPress(item)}
                onPlay={handlePlay}
                gridWidth={screenWidth / gridColumns - 24}
            />
        );
    };

    const renderFilterButton = (filter) => {
        const isLight = isColorLight(themeColor); // Check if the theme color is light

        return (
            <TouchableOpacity
                key={filter.value}
                style={[
                    styles.filterButton,
                    activeFilter === filter.value && {
                        backgroundColor: themeColor, // Apply theme color to active filter
                    },
                ]}
                onPress={() => setActiveFilter(filter.value as typeof activeFilter)}
            >
                <Text
                    style={[
                        styles.filterText,
                        isDarkMode && styles.filterTextDark,
                        activeFilter === filter.value && {
                            color: isLight ? '#000' : '#FFF', // Invert text color based on background
                            fontWeight: '600',
                        },
                    ]}
                >
                    {filter.label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            <View style={styles.headerContainer}>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    yuzic
                </Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('search')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="search" size={24} color={isDarkMode ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            marginLeft: 12,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: themeColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => accountSheetRef.current?.show()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                            {username?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                    </TouchableOpacity>

                </View>
            </View>
            <View style={styles.filterScrollContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {filters.map(renderFilterButton)}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={{ flex: 1 }}>
                <Loader/>
                </View>
            ) : sortedFilteredData.length > 0 ? (
                <FlashList
                    data={sortedFilteredData}
                    estimatedItemSize={302}
                    key={isGridView ? `grid${gridColumns}` : 'list'}
                    numColumns={isGridView ? gridColumns : 1}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 150 }}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <TouchableOpacity
                                style={styles.sortButton}
                                onPress={() => bottomSheetRef.current?.show()}
                            >
                                <Ionicons name="swap-vertical-outline" size={20} color="#fff" />
                                <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.viewToggleButton}
                                onPress={() => setIsGridView(!isGridView)}
                            >
                                <Ionicons
                                    name={isGridView ? 'list-outline' : 'grid-outline'}
                                    size={20}
                                    color={isDarkMode ? '#fff' : '#000'}
                                />
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyStateContainer}>
                    <Ionicons name="folder-open-outline" size={80} color={isDarkMode ? '#555' : '#999'} />
                    <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
                        No content available.
                    </Text>
                </View>
            )
            }

            <BottomSheet
                ref={bottomSheetRef}
                height={300}
                hasDraggableIcon
                sheetBackgroundColor={isDarkMode ? '#222' : '#f9f9f9'} // Dark and light mode backgrounds
            >
                <View style={styles.sheetContainer}>
                    <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTitleDark]}>Sort by</Text>
                    {sortOptions.map((option) => {
                        const isSelected = sortOrder === option.value;

                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.pickerItem,
                                    {
                                        backgroundColor: isSelected ? themeColor + '22' : 'transparent',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                    },
                                ]}
                                onPress={() => {
                                    const value = option.value as typeof sortOrder;
                                    setSortOrder(value);
                                    AsyncStorage.setItem('librarySortOrder', value);
                                    bottomSheetRef.current?.close();
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons
                                        name={option.icon}
                                        size={18}
                                        color={isSelected ? themeColor : isDarkMode ? '#ccc' : '#555'}
                                        style={{ marginRight: 10 }}
                                    />
                                    <Text
                                        style={[
                                            styles.pickerText,
                                            isDarkMode && styles.pickerTextDark,
                                            {
                                                fontWeight: isSelected ? '600' : '400',
                                            },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </View>

                                {isSelected && (
                                    <Ionicons
                                        name="checkmark"
                                        size={20}
                                        color={themeColor}
                                        style={styles.checkmark}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => bottomSheetRef.current?.close()}
                    >
                        <Text style={[styles.cancelText, isDarkMode && styles.cancelTextDark]}>Cancel</Text>
                    </TouchableOpacity>

                </View>
            </BottomSheet>

            <AccountActionSheet ref={accountSheetRef} themeColor={themeColor} />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    headerTitleDark: {
        color: '#fff',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterScrollContainer: {
        marginVertical: 12,
    },
    sheetContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
        backgroundColor: 'transparent', // Matches the `sheetBackgroundColor`
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333', // Light mode title color
        marginBottom: 10,
    },
    sheetTitleDark: {
        color: '#fff', // Dark mode title color
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    pickerText: {
        fontSize: 16,
        color: '#333',
    },
    pickerTextDark: {
        color: '#fff',
    },
    checkmark: {
        marginLeft: 8,
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 15,
    },
    cancelText: {
        fontSize: 16,
        color: '#333', // Light mode cancel text
    },
    cancelTextDark: {
        color: '#aaa', // Dark mode cancel text
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    activeFilterButton: {
        backgroundColor: '#007AFF',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
    },
    filterTextDark: {
        color: '#aaa',
    },
    activeFilterText: {
        color: '#fff',
        fontWeight: '600',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
    },
    sortButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 14,
    },
    viewToggleButton: {
        padding: 8,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    gridItemContainer: {
        width: Dimensions.get('window').width / 3 - 16,
        marginVertical: 8,
        marginHorizontal: 8,
        alignItems: 'flex-start',
    },
    coverArt: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 12,
    },
    gridCoverArt: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
    },
    gridTextContainer: {
        marginTop: 4,
        width: '100%',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
         color: '#fff',
    },
    titleDark: {
        color: '#ccc',
    },
    subtext: {
        fontSize: 14,
        color: '#666',
    },
    subtextDark: {
        color: '#aaa',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
    },
    emptyTitleDark: {
        color: '#ccc',
    },
    playButton: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: '#333',
        padding: 6,
        borderRadius: 999,
        opacity: 0.9,
    },
});