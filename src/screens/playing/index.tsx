import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayingState, usePlayingProgress } from '@/contexts/PlayingContext';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectShowSleepTimer, selectShowPlaybackSpeed, selectShowVolumeSlider } from '@/utils/redux/selectors/settingsSelectors';
import SongOptions from '@/components/options/SongOptions';
import Queue from './components/Queue';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { useApi } from '@/api';
import { LyricsResult } from '@/api/types';
import { useAlbum } from '@/hooks/albums';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import PlaylistList from '@/components/PlaylistList';
import PlayingMain from './components/PlayingMain';
import Controls from './components/Controls';
import BottomControls from './components/BottomControls';
import LyricsBottomSheet from './components/LyricsBottomSheet';
import LyricsPreviewCard from './components/LyricsPreviewCard';
import OutputDeviceSheet from './components/OutputDeviceSheet';
import AboutTheArtistCard from './components/AboutTheArtistCard';
import SleepTimerCard from './components/SleepTimerCard';
import PlaybackSpeedCard from './components/PlaybackSpeedCard';
import VolumeCard from './components/VolumeCard';
import { ChevronDown, Ellipsis } from 'lucide-react-native';
import { useSheetRef } from '@/utils/useSheetRef';
import Touchable from '@/components/Touchable';
import { hitSlopFor, onDark, spacing } from '@/constants/design';

interface PlayingScreenProps {
    onClose: () => void;
}

type PlayingViewMode = "player" | "queue";

// Isolated so the once-a-second progress tick only re-renders this small
// card, not the whole PlayingScreen tree (header, PlayingMain, Controls,
// BottomControls, and the other cards) — that tree stays mounted the entire
// time a song is playing, hidden behind the collapsed player sheet, so an
// unnecessary full re-render every second was a constant, avoidable cost.
const LyricsPreviewCardResolver: React.FC<{
    lyrics: LyricsResult;
    contentWidth: number;
    onPress: () => void;
}> = ({ lyrics, contentWidth, onPress }) => {
    const progress = usePlayingProgress();
    return (
        <LyricsPreviewCard
            lyrics={lyrics}
            position={progress.position}
            contentWidth={contentWidth}
            onPress={onPress}
        />
    );
};

const usePlayingTransitions = (mode: PlayingViewMode) => {
    const playerOpacity = useSharedValue(1);
    const queueOpacity = useSharedValue(0);

    useEffect(() => {
        playerOpacity.value = withTiming(mode === "player" ? 1 : 0, { duration: 300 });
        queueOpacity.value = withTiming(mode === "queue" ? 1 : 0, { duration: 300 });
    }, [mode, playerOpacity, queueOpacity]);

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
    const { currentSong } = usePlayingState();
    const api = useApi();
    const insets = useSafeAreaInsets();
    const { album } = useAlbum(currentSong?.albumId ?? '');
    const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
    const [lyricsAvailable, setLyricsAvailable] = useState(false);

    const songOptionsRef = useSheetRef();
    const playlistRef = useSheetRef();
    const lyricsSheetRef = useSheetRef();
    const outputDeviceSheetRef = useSheetRef();

    const [mode, setMode] = useState<PlayingViewMode>("player");
    const { playerStyle, queueStyle } =
        usePlayingTransitions(mode);

    const { width, height } = useWindowDimensions();
    const isTablet = width >= 768;
    const layoutWidth = width - 24;
    const contentWidth = isTablet ? 500 : width - 48;
    const playerMinHeight = height - insets.top - insets.bottom;

    useEffect(() => {
        if (!currentSong?.id) return;

        let cancelled = false;
        setLyrics(null);
        setLyricsAvailable(false);

        const task = InteractionManager.runAfterInteractions(() => {
            (async () => {
                try {
                    const res = await api.lyrics.getBySongId(currentSong.id);
                    if (cancelled) return;
                    if (res?.synced && res.lines.length > 0) {
                        setLyrics(res);
                        setLyricsAvailable(true);
                    }
                } catch {
                }
            })();
        });

        return () => {
            cancelled = true;
            task.cancel();
        };
    }, [api.lyrics, currentSong?.id]);

    const showSleepTimer = useSelector(selectShowSleepTimer);
    const showPlaybackSpeed = useSelector(selectShowPlaybackSpeed);
    const showVolumeSlider = useSelector(selectShowVolumeSlider);
    const artistId = currentSong?.artistId ?? album?.artist?.id;

    const navigateToArtist = useCallback(() => {
        if (artistId) {
            onClose();
            router.push({
                pathname: '/(home)/artistView',
                params: { id: artistId },
            });
        }
    }, [artistId, onClose, router]);

    const openLyricsSheet = useCallback(() => {
        if (lyricsAvailable && lyrics) {
            lyricsSheetRef.current?.present();
        }
    }, [lyricsAvailable, lyrics, lyricsSheetRef]);

    if (!currentSong) {
        return <View style={{ flex: 1, backgroundColor: onDark.background }} />;
    }

    return (
        <View testID="playing-screen" style={styles.gradientContainer}>
            <View style={styles.container}>
                <View style={styles.playerArea}>

                    <StatusBar
                        barStyle="light-content"
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
                                    <Touchable
                                        testID="playing-close"
                                        accessibilityRole="button"
                                        accessibilityLabel="Close player"
                                        onPress={onClose}
                                        style={styles.headerButton}
                                        hitSlop={hitSlopFor(40)}
                                    >
                                        <ChevronDown size={28} color={onDark.text} />
                                    </Touchable>

                                    <Touchable
                                        onPress={() => songOptionsRef.current?.present()}
                                        style={styles.headerButton}
                                        hitSlop={hitSlopFor(40)}
                                    >
                                        <Ellipsis size={24} color={onDark.text} />
                                    </Touchable>
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
                                        onOpenOutputSheet={() => outputDeviceSheetRef.current?.present()}
                                    />
                                </View>
                            </View>

                            {lyricsAvailable && lyrics && (
                                <LyricsPreviewCardResolver
                                    lyrics={lyrics}
                                    contentWidth={contentWidth}
                                    onPress={openLyricsSheet}
                                />
                            )}

                            {showSleepTimer && (
                                <SleepTimerCard contentWidth={contentWidth} />
                            )}

                            {showPlaybackSpeed && (
                                <PlaybackSpeedCard contentWidth={contentWidth} />
                            )}

                            {showVolumeSlider && (
                                <VolumeCard contentWidth={contentWidth} />
                            )}

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
                        </BottomSheetScrollView>
                    </Animated.View>

                </View>
            </View>
            <SongOptions
                ref={songOptionsRef}
                selectedSong={currentSong}
                onAddToPlaylist={() => playlistRef.current?.present()}
                onNavigate={onClose}
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

            <OutputDeviceSheet ref={outputDeviceSheetRef} />
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
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
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
});

export default PlayingScreen;
