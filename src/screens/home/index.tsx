import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import AlbumItem from "./components/Items/AlbumItem";
import PlaylistItem from './components/Items/PlaylistItem';
import ArtistItem from './components/Items/ArtistItem';
import TrackItem from './components/Items/TrackItem';
import SortBottomSheet from './components/SortBottomSheet';
import GridSettingsBottomSheet from './components/GridSettingsBottomSheet';
import AccountBottomSheet from './components/AccountBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice';
import {
    selectGridColumns,
    selectIsGridView,
    selectLibrarySortOrder,
    selectOfflineModeEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
    selectAlbumPlays,
    selectAlbumLastPlayedAt,
    selectArtistPlays,
    selectArtistLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import HomeHeader from './components/Header';
import LibraryFilterBar from './components/Filters';
import LibraryListHeader from './components/Content/Header';
import LibraryContent from './components/Content';
import Explore from '@/screens/explore';
import { useTheme } from '@/hooks/useTheme';
import { useGridLayout } from '@/hooks/useGridLayout';
import { selectListenBrainzConfig } from '@/utils/redux/selectors/listenbrainzSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { useFullPlaylists, usePlaylists } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { QueryKeys } from '@/enums/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { LIBRARY_INITIAL_PAGE_SIZE, LIBRARY_PAGE_SIZE } from '@/constants/library';
import { useTranslation } from 'react-i18next';
import { SongBase } from '@/types';
import { useDownloadedTracks } from 'react-native-nitro-player';

export default function HomeScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const router = useRouter();
    const dispatch = useDispatch();

    const listenbrainzConfig = useSelector(selectListenBrainzConfig);
    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;
    const username = activeServer?.username;

    const { isDarkMode } = useTheme();
    const { albums, isLoading: albumsLoading } = useAlbums();
    const { artists, isLoading: artistsLoading } = useArtists();
    const { playlists, isLoading: playlistsLoading } = usePlaylists();
    const { playlists: fullPlaylists, isLoading: fullPlaylistsLoading } = useFullPlaylists(playlists);
    const { tracks, isLoading: tracksLoading } = useTracks();
    const isLoading =
        albumsLoading ||
        artistsLoading ||
        playlistsLoading ||
        fullPlaylistsLoading ||
        tracksLoading;

    const gridColumns = useSelector(selectGridColumns);
    const isGridView = useSelector(selectIsGridView);
    const sortOrder = useSelector(selectLibrarySortOrder);
    const offlineModeEnabled = useSelector(selectOfflineModeEnabled);
    const { isTrackDownloaded } = useDownloadedTracks();

    const albumPlays = useSelector(selectAlbumPlays);
    const artistPlays = useSelector(selectArtistPlays);
    const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
    const artistLastPlayedAt = useSelector(selectArtistLastPlayedAt);

    const [activeFilter, setActiveFilter] =
        useState<'all' | 'albums' | 'artists' | 'playlists' | 'tracks'>('all');
    const [displayedCount, setDisplayedCount] = useState(LIBRARY_INITIAL_PAGE_SIZE);

    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
    const [isMounted, setIsMounted] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
    const [mode, setMode] = useState<'home' | 'explore'>('home');

    const opacity = useRef(new Animated.Value(1)).current;

    const accountSheetRef = useRef<BottomSheetModal>(null);
    const sortSheetRef = useRef<BottomSheetModal>(null);
    const gridSettingsSheetRef = useRef<BottomSheetModal>(null);

    const { gridItemWidth, gridSpacing } = useGridLayout();

    const queryClient = useQueryClient();

    useEffect(() => {
        if (!activeServer?.isAuthenticated || !activeServer?.id) return;

        const serverId = activeServer.id;
        queryClient.refetchQueries({ queryKey: [QueryKeys.Albums, serverId] });
        queryClient.refetchQueries({ queryKey: [QueryKeys.Artists, serverId] });
        queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] });
        queryClient.refetchQueries({ queryKey: [QueryKeys.Tracks, serverId] });
    }, [activeServer?.id, activeServer?.isAuthenticated, queryClient]);

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
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => sub?.remove?.();
    }, []);

    const downloadedTracks = useMemo(
        () => tracks.filter(track => isTrackDownloaded(track.id)),
        [tracks, isTrackDownloaded]
    );

    const downloadedTrackIds = useMemo(
        () => new Set(downloadedTracks.map(track => track.id)),
        [downloadedTracks]
    );

    const downloadedAlbumIds = useMemo(
        () => new Set(downloadedTracks.map(track => track.albumId)),
        [downloadedTracks]
    );

    const downloadedPlaylistIds = useMemo(
        () =>
            new Set(
                fullPlaylists
                    .filter(playlist =>
                        playlist.songs.some(song => downloadedTrackIds.has(song.id))
                    )
                    .map(playlist => playlist.id)
            ),
        [fullPlaylists, downloadedTrackIds]
    );

    const albumData = useMemo(() => {
        const source = offlineModeEnabled
            ? albums.filter(a => downloadedAlbumIds.has(a.id))
            : albums;
        return source.map(a => ({ ...a, type: 'Album' as const }));
    }, [albums, offlineModeEnabled, downloadedAlbumIds]);

    const artistData = useMemo(() => artists.map(a => ({ ...a, type: 'Artist' as const })), [artists]);

    const playlistData = useMemo(() => {
        const source = offlineModeEnabled
            ? playlists.filter(p => downloadedPlaylistIds.has(p.id))
            : playlists;
        return source.map(p => ({ ...p, type: 'Playlist' as const }));
    }, [playlists, offlineModeEnabled, downloadedPlaylistIds]);

    const trackData = useMemo(() => {
        const source = offlineModeEnabled
            ? downloadedTracks
            : tracks;
        return source.map(t => ({ ...t, type: 'Track' as const }));
    }, [tracks, offlineModeEnabled, downloadedTracks]);

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
            case 'tracks':
                return trackData;
            default:
                return allData;
        }
    }, [activeFilter, albumData, artistData, playlistData, trackData, allData]);

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
                data.sort((a, b) => {
                    const aTime =
                        a.type === 'Album'
                            ? albumLastPlayedAt[a.id] ?? 0
                            : a.type === 'Artist'
                                ? artistLastPlayedAt[a.id] ?? 0
                                : 0;
                    const bTime =
                        b.type === 'Album'
                            ? albumLastPlayedAt[b.id] ?? 0
                            : b.type === 'Artist'
                                ? artistLastPlayedAt[b.id] ?? 0
                                : 0;
                    return bTime - aTime;
                });
                break;
            case 'userplays':
                data.sort((a, b) => {
                    const aPlays =
                        a.type === 'Album'
                            ? albumPlays[a.id] ?? 0
                            : a.type === 'Artist'
                                ? artistPlays[a.id] ?? 0
                                : 0;

                    const bPlays =
                        b.type === 'Album'
                            ? albumPlays[b.id] ?? 0
                            : b.type === 'Artist'
                                ? artistPlays[b.id] ?? 0
                                : 0;

                    return bPlays - aPlays;
                });
                break;
            case 'year':
                data.sort((a, b) => {
                    if (a.type !== 'Album' || b.type !== 'Album') return 0;
                    return (b.year ?? 0) - (a.year ?? 0);
                });
                break;
        }
        return data;
    }, [filteredData, sortOrder, albumPlays, artistPlays, albumLastPlayedAt, artistLastPlayedAt]);

    useEffect(() => {
        setDisplayedCount(LIBRARY_INITIAL_PAGE_SIZE);
    }, [activeFilter, sortOrder]);

    const displayedData = useMemo(
        () => sortedFilteredData.slice(0, displayedCount),
        [sortedFilteredData, displayedCount]
    );

    const hasMore = displayedCount < sortedFilteredData.length;
    const loadMore = useCallback(() => {
        if (hasMore) {
            setDisplayedCount((prev) => Math.min(prev + LIBRARY_PAGE_SIZE, sortedFilteredData.length));
        }
    }, [hasMore, sortedFilteredData.length]);

    const filters = [
        { label: t('home.filters.all'), value: 'all' },
        { label: t('home.filters.albums'), value: 'albums' },
        { label: t('home.filters.artists'), value: 'artists' },
        { label: t('home.filters.playlists'), value: 'playlists' },
        { label: t('home.filters.tracks'), value: 'tracks' },
    ] as const;

    const visibleTracks = useMemo(
        () =>
            displayedData
                .filter((item: any) => item.type === 'Track')
                .map((item: any) => {
                    const { type, ...track } = item;
                    return track as SongBase;
                }),
        [displayedData]
    );

    const renderItem = ({ item }: { item: any }) => {
        switch (item.type) {
            case 'Album':
                return <AlbumItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} gridSpacing={gridSpacing} />;
            case 'Playlist':
                return <PlaylistItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} gridSpacing={gridSpacing} />;
            case 'Artist':
                return <ArtistItem {...item} isGridView={isGridView} gridWidth={gridItemWidth} gridSpacing={gridSpacing} />;
            case 'Track':
                return (
                    <TrackItem
                        song={item}
                        visibleTracks={visibleTracks}
                        isGridView={isGridView}
                        gridWidth={gridItemWidth}
                        gridSpacing={gridSpacing}
                    />
                );
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
                title={t('home.title')}
                username={username}
                onSearch={() => (navigation as any).navigate('search')}
                onAccountPress={toggleAccountSheet}
            />

            <LibraryFilterBar
                mode={mode}
                value={activeFilter}
                filters={filters}
                onChange={setActiveFilter}
                onExplorePress={() => {
                    fadeTo(mode === 'explore' ? 'home' : 'explore');
                }}
            />

            <Animated.View style={{ flex: 1, opacity }}>
                {mode === 'home' ? (
                    <>
                        <LibraryContent
                            data={displayedData}
                            isLoading={isLoading}
                            onEndReached={loadMore}
                            hasMore={hasMore}
                            isGridView={isGridView}
                            gridColumns={gridColumns}
                            gridItemWidth={gridItemWidth}
                            estimatedItemSize={302}
                            renderItem={renderItem}
                            ListHeaderComponent={
                                <LibraryListHeader
                                    sortOrder={sortOrder}
                                    onSortPress={() => sortSheetRef.current?.present()}
                                    onGridSettingsPress={() => gridSettingsSheetRef.current?.present()}
                                />
                            }
                        />

                        <SortBottomSheet
                            ref={sortSheetRef}
                            sortOrder={sortOrder}
                            onSelect={(value) => {
                                dispatch(setLibrarySortOrder(value));
                                sortSheetRef.current?.dismiss();
                            }}
                        />

                        <GridSettingsBottomSheet ref={gridSettingsSheetRef} />
                    </>
                ) : (
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            { opacity: mode === 'explore' ? opacity : 0 },
                        ]}
                        pointerEvents={mode === 'explore' ? 'auto' : 'none'}
                    >
                        <Explore {...({ onBack: () => fadeTo('home') } as any)} />
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