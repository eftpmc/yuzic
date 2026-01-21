import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from "@react-navigation/native";
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
import Lyrics from './components/Lyrics';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import PlaylistList from '@/components/PlaylistList';
import PlayingMain from './components/PlayingMain';
import Controls from './components/Controls';
import BottomControls from './components/BottomControls';
import { ChevronDown, Ellipsis } from 'lucide-react-native';
import { useArtists } from '@/hooks/artists';

interface PlayingScreenProps {
    onClose: () => void;
}

type PlayingViewMode = "player" | "queue" | "lyrics";

const usePlayingTransitions = (mode: PlayingViewMode) => {
    const playerOpacity = useSharedValue(1);
    const queueOpacity = useSharedValue(0);
    const lyricsOpacity = useSharedValue(0);

    useEffect(() => {
        playerOpacity.value = withTiming(mode === "player" ? 1 : 0, { duration: 300 });
        queueOpacity.value = withTiming(mode === "queue" ? 1 : 0, { duration: 300 });
        lyricsOpacity.value = withTiming(mode === "lyrics" ? 1 : 0, { duration: 300 });
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

    const lyricsStyle = useAnimatedStyle(() => ({
        opacity: lyricsOpacity.value,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    return {
        playerStyle,
        queueStyle,
        lyricsStyle,
    };
};

const PlayingScreen: React.FC<PlayingScreenProps> = ({
    onClose,
}) => {
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const {
        currentSong
    } = usePlaying();
    const api = useApi();
    const { artists } = useArtists();
    const insets = useSafeAreaInsets();
    const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
    const [lyricsAvailable, setLyricsAvailable] = useState(false);

    const songOptionsRef = useRef<BottomSheetModal>(null);
    const playlistRef = useRef<BottomSheetModal>(null);

    const [mode, setMode] = useState<PlayingViewMode>("player");
    const { playerStyle, queueStyle, lyricsStyle } =
        usePlayingTransitions(mode);

    const lastCoverRef = useRef<CoverSource | null>(null);

    const { width } = Dimensions.get('window');
    const isTablet = width >= 768;
    const layoutWidth = width - 24;

    useEffect(() => {
        if (!currentSong?.id) return;

        let cancelled = false;

        setLyrics(null);
        setLyricsAvailable(false);
        setMode("player");

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

    const navigateToArtist = () => {
        onClose();

        if (currentSong.artist) {
            const artist = artists.find(
                a => a.name === currentSong.artist
            );

            if (artist?.id) {
                navigation.navigate("(home)", {
                    screen: "artistView",
                    params: { id: artist.id },
                });
            }
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
                        style={[lyricsStyle, { alignItems: "center", justifyContent: "flex-start" }]}
                        pointerEvents={mode === "lyrics" ? "auto" : "none"}
                    >
                        {lyrics && (
                            <Lyrics
                                lyrics={lyrics}
                                width={layoutWidth}
                                onBack={() => setMode("player")}
                            />
                        )}
                    </Animated.View>

                    <Animated.View
                        style={[playerStyle, { alignItems: 'center', justifyContent: 'center' }]}
                        pointerEvents={mode === "player" ? 'auto' : 'none'}
                    >
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
                                width={isTablet ? 500 : 330}
                                onPressArtist={navigateToArtist}
                                onPressOptions={() => songOptionsRef.current?.present()}
                                onPressAdd={() => playlistRef.current?.present()}
                            />

                            <View style={{ width: isTablet ? 500 : 330 }}>
                                <Controls />
                            </View>
                        </View>
                    </Animated.View>

                </View>
                <View style={{ width: isTablet ? 500 : 330, marginTop: 24, bottom: insets.bottom + (Platform.OS === "ios" ? 12 : 12) }}>
                    <BottomControls
                        lyricsAvailable={lyricsAvailable}
                        mode={mode}
                        setMode={setMode}
                    />
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
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        alignItems: 'center',
    },
    activeUtilityButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
    },
    coverArt: {
        borderRadius: 10,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 10,
    },
    titleArtistContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    textContainer: {
        flex: 1,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },

    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    utilityContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 48 : 32,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 32,
        alignSelf: 'center',
        zIndex: 99,
        backgroundColor: 'rgba(0,0,0,0.2)', // optional styling
        borderRadius: 16,                   // optional styling
    },
    utilityButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
    },
    optionsButton: {
        marginLeft: 16,
    },
    detailsContainer: {
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    artist: {
        fontSize: 14,
        fontWeight: '400',
    },
    slider: {
        height: 40,
    },
    timestamps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeButton: {
        position: 'absolute',
        left: 16,
        padding: 4,
    },
    queueButton: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 60 : 32,
        right: 16,
        padding: 4,
    },
});

export default PlayingScreen;