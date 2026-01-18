import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useLibrary } from '@/contexts/LibraryContext';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import AlbumItem from "./components/Items/AlbumItem";
import PlaylistItem from './components/Items/PlaylistItem';
import ArtistItem from './components/Items/ArtistItem';
import SortBottomSheet from './components/SortBottomSheet';
import AccountBottomSheet from './components/AccountBottomSheet';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import { setIsGridView, setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice';
import { selectGridColumns, selectIsGridView, selectLibrarySortOrder } from '@/utils/redux/selectors/settingsSelectors';
import HomeHeader from './components/Header';
import LibraryFilterBar from './components/Filters';
import LibraryListHeader from './components/Content/Header';
import LibraryContent from './components/Content';
import Explore from '@/screens/explore';
import { useTheme } from '@/hooks/useTheme';
import { useGridLayout } from '@/hooks/useGridLayout';
import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import { toast } from '@backpackapp-io/react-native-toast';

export default function HomeScreen() {
    const navigation = useNavigation();
    const router = useRouter();
    const dispatch = useDispatch();

    const lastfmConfig = useSelector(selectLastfmConfig);
    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;
    const username = activeServer?.username;

    const { isDarkMode } = useTheme();
    const { albums, artists, playlists, fetchLibrary, clearLibrary, isLoading } = useLibrary();

    const gridColumns = useSelector(selectGridColumns);
    const isGridView = useSelector(selectIsGridView);
    const sortOrder = useSelector(selectLibrarySortOrder);

    const [activeFilter, setActiveFilter] =
        useState<'all' | 'albums' | 'artists' | 'playlists'>('all');

    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
    const [isMounted, setIsMounted] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
    const [mode, setMode] = useState<'home' | 'explore'>('home');

    const opacity = useRef(new Animated.Value(1)).current;

    const accountSheetRef = useRef<BottomSheetModal>(null);
    const sortSheetRef = useRef<BottomSheet>(null);

    const { gridItemWidth } = useGridLayout();

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
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => sub?.remove?.();
    }, []);

    const albumData = useMemo(() => albums.map(a => ({ ...a, type: 'Album' as const })), [albums]);
    const artistData = useMemo(() => artists.map(a => ({ ...a, type: 'Artist' as const })), [artists]);
    const playlistData = useMemo(() => playlists.map(p => ({ ...p, type: 'Playlist' as const })), [playlists]);

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

    const currentSortLabel =
        sortOrder === 'title'
            ? 'Alphabetical'
            : sortOrder === 'recent'
                ? 'Most Recent'
                : 'Most Played';

    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'Album':
                return <AlbumItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} />;
            case 'Playlist':
                return <PlaylistItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} />;
            case 'Artist':
                return <ArtistItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} />;
            default:
                return null;
        }
    };

    const fadeTo = (next: 'home' | 'explore') => {
        setMode(next);
        opacity.setValue(0);
        Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
    };

    const toggleAccountSheet = () => {
        if (isAccountSheetOpen) {
            accountSheetRef.current?.dismiss();
        } else {
            setIsAccountSheetOpen(true);
            accountSheetRef.current?.present();
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
                onAccountPress={toggleAccountSheet}
            />

            <LibraryFilterBar
                mode={mode}
                value={activeFilter}
                filters={filters}
                onChange={setActiveFilter}
                onExplorePress={() => {
                    if (!lastfmConfig.apiKey) {
                        toast.error('Connect Last.fm to use Explore');
                        return;
                    }
                    fadeTo(mode === 'explore' ? 'home' : 'explore');
                }}
            />

            <Animated.View style={{ flex: 1, opacity }}>
                {mode === 'home' ? (
                    <>
                        <LibraryContent
                            data={sortedFilteredData}
                            isLoading={isLoading}
                            isGridView={isGridView}
                            gridColumns={gridColumns}
                            gridItemWidth={gridItemWidth}
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
                    </>
                ) : (
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            { opacity: mode === 'explore' ? opacity : 0 },
                        ]}
                        pointerEvents={mode === 'explore' ? 'auto' : 'none'}
                    >
                        <Explore onBack={() => fadeTo('home')} />
                    </Animated.View>
                )}
            </Animated.View>

            <AccountBottomSheet
                ref={accountSheetRef}
                onDismiss={() => setIsAccountSheetOpen(false)}
            />
        </SafeAreaView>
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