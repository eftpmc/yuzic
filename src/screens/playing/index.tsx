import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaying } from '@/contexts/PlayingContext';
import { useRouter } from 'expo-router';
import SongOptions from '@/components/options/SongOptions';
import Queue from './components/Queue';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { CoverSource } from '@/types';
import { useApi } from '@/api';
import { LyricsResult } from '@/api/types';
import { useTheme } from '@/hooks/useTheme';
import { useAlbum } from '@/hooks/albums';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import PlaylistList from '@/components/PlaylistList';
import PlayingMain from './components/PlayingMain';
import Controls from './components/Controls';
import BottomControls from './components/BottomControls';
import LyricsBottomSheet from './components/LyricsBottomSheet';
import LyricsPreviewCard from './components/LyricsPreviewCard';
import AboutTheArtistCard from './components/AboutTheArtistCard';
import { ChevronDown, Ellipsis } from 'lucide-react-native';

interface PlayingScreenProps {
    onClose: () => void;
}

type PlayingViewMode = "player" | "queue";

const usePlayingTransitions = (mode: PlayingViewMode) => {
    const playerOpacity = useSharedValue(1);
    const queueOpacity = useSharedValue(0);

    useEffect(() => {
        playerOpacity.value = withTiming(mode === "player" ? 1 : 0, { duration: 300 });
        queueOpacity.value = withTiming(mode === "queue" ? 1 : 0, { duration: 300 });
    }, [mode]);

    const playerStyle = useAnimatedStyle(() => ({
        opacity: playerOpacity.value,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    const queueStyle = useAnimatedStyle(() => ({
        opacity: queueOpacity.value,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    return {
        playerStyle,
        queueStyle,
    };
};

const PlayingScreen: React.FC<PlayingScreenProps> = ({
    onClose,
}) => {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const {
        currentSong,
        progress,
    } = usePlaying();
    const api = useApi();
    const insets = useSafeAreaInsets();
    const { album } = useAlbum(currentSong?.albumId ?? '');
    const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
    const [lyricsAvailable, setLyricsAvailable] = useState(false);

    const songOptionsRef = useRef<BottomSheetModal>(null);
    const playlistRef = useRef<BottomSheetModal>(null);
    const lyricsSheetRef = useRef<BottomSheetModal>(null);

    const [mode, setMode] = useState<PlayingViewMode>("player");
    const { playerStyle, queueStyle } =
        usePlayingTransitions(mode);

    const lastCoverRef = useRef<CoverSource | null>(null);

    const { width, height } = Dimensions.get('window');
    const isTablet = width >= 768;
    const layoutWidth = width - 24;
    const contentWidth = isTablet ? 500 : width - 48;
    const playerMinHeight = height - insets.top - insets.bottom;

    useEffect(() => {
        if (!currentSong?.id) return;

        let cancelled = false;

        setLyrics(null);
        setLyricsAvailable(false);

        (async () => {
            try {
                const res = await api.lyrics.getBySongId(currentSong.id);

                if (cancelled) return;

                if (res?.synced && res.lines.length > 0) {
                    setLyrics(res);
                    setLyricsAvailable(true);
                }
            } catch (err) {
                console.error("❌ Lyrics fetch failed", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentSong?.id]);

    useEffect(() => {
        if (currentSong?.cover) {
            lastCoverRef.current = currentSong.cover;
        }
    }, [currentSong?.id]);

    if (!currentSong) {
        return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    }

    const artistId = currentSong.artistId ?? album?.artist?.id;
    const navigateToArtist = () => {
        if (artistId) {
            onClose();
            router.push({
                pathname: '/(home)/artistView',
                params: { id: artistId },
            });
        }
    };

    const openLyricsSheet = () => {
        if (lyricsAvailable && lyrics) {
            lyricsSheetRef.current?.present();
        }
    };

    return (
        <View style={styles.gradientContainer}>
            <View style={styles.container}>
                <View style={styles.playerArea}>

                    <StatusBar
                        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                        backgroundColor="transparent"
                        translucent
                    />
                    <Animated.View
                        style={[queueStyle, { alignItems: 'center', justifyContent: 'flex-start' }]}
                        pointerEvents={mode === "queue" ? 'auto' : 'none'}
                    >
                        <Queue
                            onBack={() => setMode("player")}
                            width={layoutWidth}
                        />
                    </Animated.View>

                    <Animated.View
                        style={[playerStyle, { flex: 1, width: '100%' }]}
                        pointerEvents={mode === "player" ? 'auto' : 'none'}
                    >
                        <BottomSheetScrollView
                            style={styles.scrollView}
                            contentContainerStyle={[
                                styles.scrollContent,
                                { paddingBottom: insets.bottom + (lyricsAvailable ? 100 : 24) },
                            ]}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={[styles.playerSection, { minHeight: playerMinHeight }]}>
                                <View style={[styles.header, { paddingTop: insets.top }]}>
                                    <TouchableOpacity
                                        onPress={onClose}
                                        style={styles.headerButton}
                                    >
                                        <ChevronDown size={28} color="#fff" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => songOptionsRef.current?.present()}
                                        style={styles.headerButton}
                                    >
                                        <Ellipsis size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.centerContent}>
                                    <PlayingMain
                                        width={contentWidth}
                                        onPressArtist={navigateToArtist}
                                        onPressOptions={() => songOptionsRef.current?.present()}
                                        onPressAdd={() => playlistRef.current?.present()}
                                    />

                                    <View style={{ width: contentWidth }}>
                                        <Controls />
                                    </View>
                                </View>

                                <View
                                    style={[
                                        styles.bottomControlsRow,
                                        {
                                            width: contentWidth,
                                            paddingBottom: insets.bottom + 12,
                                        },
                                    ]}
                                >
                                    <BottomControls
                                        mode={mode}
                                        setMode={setMode}
                                    />
                                </View>
                            </View>

                            <AboutTheArtistCard
                                artistName={currentSong.artist}
                                artistCover={
                                  album?.artist?.cover ??
                                  currentSong.cover ??
                                  null
                                }
                                contentWidth={contentWidth}
                                onPress={artistId ? navigateToArtist : undefined}
                            />

                            {lyricsAvailable && lyrics && (
                                <LyricsPreviewCard
                                    lyrics={lyrics}
                                    position={progress.position}
                                    contentWidth={contentWidth}
                                    onPress={openLyricsSheet}
                                />
                            )}
                        </BottomSheetScrollView>
                    </Animated.View>

                </View>
            </View>
            <SongOptions
                ref={songOptionsRef}
                selectedSong={currentSong}
                onAddToPlaylist={() => playlistRef.current?.present()}
            />

            <PlaylistList
                ref={playlistRef}
                selectedSong={currentSong}
                onClose={() => playlistRef.current?.dismiss()}
            />

            <LyricsBottomSheet
                ref={lyricsSheetRef}
                lyrics={lyrics}
                onClose={() => lyricsSheetRef.current?.dismiss()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    playerArea: {
        flex: 1,
        width: '100%',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
    },
    playerSection: {
        width: '100%',
        alignItems: 'center',
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
    },
});

export default PlayingScreen;
