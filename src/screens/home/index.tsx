import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '@/utils/storage';
import AlbumItem from "./components/AlbumItem";
import { useRouter } from 'expo-router';
import AccountActionSheet from '@/components/AccountActionSheet';
import Loader from '@/components/Loader'
import { useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import PlaylistItem from './components/PlaylistItem';
import ArtistItem from './components/ArtistItem';
import SortBottomSheet from './components/SortBottomSheet';
import BottomSheet from '@gorhom/bottom-sheet';

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
    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;
    const username = activeServer?.username;
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { albums, artists, playlists, fetchLibrary, clearLibrary, isLoading } = useLibrary();
    const { themeColor, gridColumns } = useSettings();

    const [activeFilter, setActiveFilter] = useState<'all' | 'albums' | 'artists' | 'playlists'>('all');
    const [isGridView, setIsGridView] = useState(
        Storage.get('isGridView')
    );
    const [sortOrder, setSortOrder] = useState(
        Storage.get('librarySortOrder')
    );

    const bottomSheetRef = useRef<BottomSheet>(null);
    const accountSheetRef = useRef<BottomSheet>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

    const sortSheetRef = useRef<BottomSheet>(null);

    const GRID_MARGIN = 8 * 2;
    const gridWidth =
        screenWidth / gridColumns - GRID_MARGIN;


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

    const albumData = useMemo(
        () => albums.map(a => ({ ...a, type: 'Album' as const })),
        [albums]
    );

    const artistData = useMemo(
        () => artists.map(a => ({ ...a, type: 'Artist' as const })),
        [artists]
    );

    const playlistData = useMemo(
        () => playlists.map(p => ({ ...p, type: 'Playlist' as const })),
        [playlists]
    );

    const allData = useMemo(
        () => [...albumData, ...artistData, ...playlistData],
        [albumData, artistData, playlistData]
    );

    const filteredData = useMemo(() => {
        switch (activeFilter) {
            case 'albums':
                return albumData;
            case 'artists':
                return artistData;
            case 'playlists':
                return playlistData;
            default:
                return allData;
        }
    }, [activeFilter, albumData, artistData, playlistData, allData]);

    const sortedFilteredData = useMemo(() => {
        const data = [...filteredData];

        switch (sortOrder) {
            case 'title':
                data.sort((a, b) => {
                    const aTitle = 'title' in a ? a.title : a.name;
                    const bTitle = 'title' in b ? b.title : b.name;
                    return aTitle.localeCompare(bTitle);
                });
                break;

            case 'recent':
                data.reverse();
                break;

            case 'userplays':
                data.sort(
                    (a, b) =>
                        ('userPlayCount' in b ? b.userPlayCount : 0) -
                        ('userPlayCount' in a ? a.userPlayCount : 0)
                );
                break;
        }

        return data;
    }, [filteredData, sortOrder]);

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

    const renderItem = ({ item }) => {
        switch (item.type) {
            case "Album":
                return (
                    <AlbumItem
                        id={item.id}
                        title={item.title}
                        subtext={item.subtext}
                        cover={item.cover}
                        isGridView={isGridView}
                        isDarkMode={isDarkMode}
                        gridWidth={gridWidth}
                    />
                );
            case "Playlist":
                return (
                    <PlaylistItem
                        id={item.id}
                        title={item.title}
                        subtext={item.subtext}
                        cover={item.cover}
                        isGridView={isGridView}
                        isDarkMode={isDarkMode}
                        gridWidth={gridWidth}
                    />
                );
            case "Artist":
                return (
                    <ArtistItem
                        id={item.id}
                        name={item.name}
                        subtext={item.subtext}
                        cover={item.cover}
                        isGridView={isGridView}
                        isDarkMode={isDarkMode}
                        gridWidth={gridWidth}
                    />
                );
            default:
                return null;
        }
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
                <View style={styles.loaderContainer}>
                    <Loader />
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
                                onPress={() => sortSheetRef.current?.show()}
                            >
                                <Ionicons name="swap-vertical-outline" size={20} color={isDarkMode ? "#fff" : '#000'} />
                                <Text style={[styles.sortButtonText, isDarkMode && styles.sortButtonTextDark]}>{currentSortLabel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.viewToggleButton}
                                onPress={() => {
                                    const next = !isGridView;
                                    setIsGridView(next);
                                    Storage.set('isGridView', next);
                                }}

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

            <SortBottomSheet
                ref={sortSheetRef}
                sortOrder={sortOrder}
                onSelect={(value) => {
                    setSortOrder(value);
                    Storage.set('librarySortOrder', value);
                    sortSheetRef.current?.close();
                }}
            />
            <AccountActionSheet ref={accountSheetRef} />
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
    loaderContainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 12,
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
        backgroundColor: 'transparent',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    sheetTitleDark: {
        color: '#fff',
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
        color: '#333',
    },
    cancelTextDark: {
        color: '#aaa',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
    },
    filterButton: {
        marginHorizontal: 2,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#555'
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
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
    },
    sortButtonText: {
        marginLeft: 8,
        color: '#000',
        fontSize: 14,
    },
    sortButtonTextDark: {
        color: '#fff'
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