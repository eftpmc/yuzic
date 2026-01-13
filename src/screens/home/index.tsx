import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLibrary } from '@/contexts/LibraryContext';;
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import AlbumItem from "./components/Items/AlbumItem";
import PlaylistItem from './components/Items/PlaylistItem';
import ArtistItem from './components/Items/ArtistItem';
import SortBottomSheet from './components/SortBottomSheet';
import AccountActionSheet from './components/AccountActionSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { setIsGridView, setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice';
import { selectGridColumns, selectIsGridView, selectLibrarySortOrder } from '@/utils/redux/selectors/settingsSelectors';
import HomeHeader from './components/Header';
import LibraryFilterBar from './components/Filters';
import LibraryListHeader from './components/Content/Header';
import LibraryContent from './components/Content';
import { useTheme } from '@/hooks/useTheme';

export default function HomeScreen() {
    const navigation = useNavigation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;
    const username = activeServer?.username;
    const { isDarkMode } = useTheme();
    const { albums, artists, playlists, fetchLibrary, clearLibrary, isLoading } = useLibrary();
    const gridColumns = useSelector(selectGridColumns);

    const [activeFilter, setActiveFilter] = useState<'all' | 'albums' | 'artists' | 'playlists'>('all');
    const dispatch = useDispatch();

    const isGridView = useSelector(selectIsGridView);
    const sortOrder = useSelector(selectLibrarySortOrder);

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
    ] as const;

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

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            <HomeHeader
                title="yuzic"
                username={username}
                onSearch={() => navigation.navigate('search')}
                onAccountPress={() => accountSheetRef.current?.show()}
            />

            <LibraryFilterBar
                value={activeFilter}
                filters={filters}
                onChange={setActiveFilter}
            />

            <LibraryContent
                data={sortedFilteredData}
                isLoading={isLoading}
                isGridView={isGridView}
                gridColumns={gridColumns}
                gridItemWidth={gridWidth}
                estimatedItemSize={302}
                renderItem={renderItem}
                ListHeaderComponent={
                    <LibraryListHeader
                        sortLabel={currentSortLabel}
                        onSortPress={() => sortSheetRef.current?.show()}
                        onToggleView={() => dispatch(setIsGridView(!isGridView))}
                    />
                }
            />

            <SortBottomSheet
                ref={sortSheetRef}
                sortOrder={sortOrder}
                onSelect={(value) => {
                    dispatch(setLibrarySortOrder(value));
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
});