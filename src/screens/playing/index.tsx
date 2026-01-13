import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Platform,
    StatusBar,
    Dimensions,
    AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { usePlaying } from '@/contexts/PlayingContext';
import ImageColors from 'react-native-image-colors';
import { useNavigation } from "@react-navigation/native";
import { Image } from 'expo-image';
import PlayingSongOptions from './components/PlayingSongOptions';
import Queue from './components/Queue';
import BackgroundGradient from './components/BackgroundGradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { AirplayButton } from 'react-airplay';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import { useApi } from '@/api';
import { LyricsResult } from '@/api/types';
import { toast } from '@backpackapp-io/react-native-toast';
import Lyrics from './components/Lyrics';
import { useTheme } from '@/hooks/useTheme';

interface PlayingScreenProps {
    onClose: () => void;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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
    const { position } = useProgress(250);
    const {
        currentSong,
        pauseSong,
        resumeSong,
        isPlaying,
        skipToNext,
        skipToPrevious,
        shuffleOn,
        toggleShuffle,
        repeatOn,
        toggleRepeat,
    } = usePlaying();
    const duration = currentSong ? Number(currentSong.duration) : 1;
    const api = useApi();
    const { artists } = useLibrary();
    const insets = useSafeAreaInsets();
    const themeColor = useSelector(selectThemeColor);
    const [currentGradient, setCurrentGradient] = useState(['#000', '#000']);
    const [nextGradient, setNextGradient] = useState(['#000', '#000']);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);
    const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
    const [lyricsAvailable, setLyricsAvailable] = useState(false);

    const [mode, setMode] = useState<PlayingViewMode>("player");
    const { playerStyle, queueStyle, lyricsStyle } =
        usePlayingTransitions(mode);


    const lastCoverRef = useRef<CoverSource | null>(null);

    const { width } = Dimensions.get('window');
    const isTablet = width >= 768;
    const layoutWidth = width - 24;

    const darkenHexColor = (hex: string, amount: number = 0.2) => {
        let col = hex.replace('#', '');
        if (col.length === 3) {
            col = col.split('').map(c => c + c).join('');
        }

        const num = parseInt(col, 16);
        let r = (num >> 16) & 0xff;
        let g = (num >> 8) & 0xff;
        let b = num & 0xff;

        r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
        g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
        b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const extractColors = async (uri: string) => {
        try {
            const colors = await ImageColors.getColors(uri, {
                fallback: '#121212',
            });

            let dominant = '#121212';

            if (colors.platform === 'android') {
                dominant = colors.darkVibrant || colors.dominant || dominant;
            } else {
                dominant = colors.primary || dominant;
            }

            dominant = darkenHexColor(dominant, 0.3);

            setNextGradient([dominant, '#000']);
        } catch {
            setNextGradient(['#121212', '#000']);
        }
    };


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

    const closeButtonOffset =
        Platform.OS === 'android' ? 60 : 32;

    useEffect(() => {
        if (currentSong?.cover) {
            lastCoverRef.current = currentSong.cover;
        }
    }, [currentSong?.id]);

    if (!currentSong) {
        return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    }

    const coverUri =
        buildCover(currentSong?.cover, "detail") ??
        buildCover(lastCoverRef.current, "detail") ??
        buildCover({ kind: "none" }, "detail");

    const navigateToArtist = () => {
        onClose();

        if (currentSong.artist) {
            const artist = artists.find(a => a.name === currentSong.artist);

            if (artist?.id) {
                console.log(`Navigating to artist with ID: ${artist.id}`);
                navigation.navigate("(home)", {
                    screen: "artistView",
                    params: {
                        id: artist.id
                    }
                });
            } else {
                console.error("Artist ID not found for the current song.");
            }
        }
    };

    return (
        <View style={styles.gradientContainer}>
            <BackgroundGradient
                current={currentGradient}
                next={nextGradient}
                onFadeComplete={() => setCurrentGradient([...nextGradient])}
            />

            <SafeAreaView
                style={[
                    styles.container
                ]}>
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
                    <TouchableOpacity
                        onPress={onClose}
                        style={[
                            styles.closeButton,
                            { top: insets.top + closeButtonOffset }
                        ]}
                    >
                        <Ionicons name="chevron-down" size={28} color="#fff" />
                    </TouchableOpacity>

                    <Image
                        source={{ uri: coverUri }}
                        style={[
                            styles.coverArt,
                            { width: isTablet ? 500 : 315, height: isTablet ? 500 : 315 },
                        ]}
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={300}
                        onLoad={() => {
                            extractColors(coverUri);
                        }}
                    />

                    <View style={[styles.detailsContainer, { width: isTablet ? 500 : 315 }]}>
                        <View style={styles.titleArtistContainer}>
                            <View style={styles.textContainer}>
                                <Text style={[styles.title, { color: '#fff' }]}>
                                    {currentSong.title}
                                </Text>
                                <TouchableOpacity onPress={navigateToArtist}>
                                    <Text style={[styles.artist, { color: '#ddd' }]}>
                                        {currentSong.artist}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.optionsButton}>
                                <PlayingSongOptions selectedSong={currentSong} />
                            </View>
                        </View>
                        <Slider
                            style={[styles.slider, { width: isTablet ? 500 : 315 }]}
                            value={isSeeking ? seekPosition : position} // <- Show seek position if dragging
                            minimumValue={0}
                            maximumValue={duration}
                            minimumTrackTintColor="#fff"
                            maximumTrackTintColor="#888"
                            thumbTintColor="#fff"
                            onValueChange={(value) => {
                                if (!isSeeking) setIsSeeking(true);
                                setSeekPosition(value);
                            }}
                            onSlidingComplete={async (value) => {
                                setSeekPosition(value);
                                await TrackPlayer.seekTo(value);

                                setTimeout(() => {
                                    setIsSeeking(false);
                                }, 200);
                            }}
                        />
                        <View style={[styles.timestamps, { width: isTablet ? 500 : 315 }]}>
                            <Text style={[styles.timestamp, { color: '#ddd' }]}>
                                {formatTime(isSeeking ? seekPosition : position)}
                            </Text>
                            <Text style={[styles.timestamp, { color: '#ddd' }]}>
                                -{formatTime(duration - (isSeeking ? seekPosition : position))}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.controls, { width: isTablet ? 500 : 315 }]}>
                        {/* Repeat Toggle */}
                        <TouchableOpacity onPress={toggleRepeat}>
                            <Ionicons
                                name="repeat"
                                size={24}
                                color={repeatOn ? '#fff' : '#888'}
                            />
                        </TouchableOpacity>

                        {/* Previous */}
                        <TouchableOpacity onPress={skipToPrevious}>
                            <Ionicons name="play-skip-back" size={28} color="#fff" />
                        </TouchableOpacity>

                        {/* Play/Pause */}
                        <TouchableOpacity onPress={isPlaying ? pauseSong : resumeSong}>
                            <Ionicons
                                name={isPlaying ? 'pause-circle' : 'play-circle'}
                                size={80}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        {/* Next */}
                        <TouchableOpacity onPress={skipToNext}>
                            <Ionicons name="play-skip-forward" size={28} color="#fff" />
                        </TouchableOpacity>

                        {/* Shuffle Toggle */}
                        <TouchableOpacity onPress={toggleShuffle}>
                            <Ionicons
                                name="shuffle"
                                size={24}
                                color={shuffleOn ? '#fff' : '#888'}
                            />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
                <View style={[styles.utilityContainer, {
                    width: isTablet ? 500 : 315,
                    marginTop: 32,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 20,
                    alignSelf: 'center',
                }]}>
                    <TouchableOpacity
                        onPress={() => {
                            if (!lyricsAvailable) {
                                toast("Lyrics aren’t available for this song");
                                return;
                            }
                            setMode(mode === "lyrics" ? "player" : "lyrics");
                        }}
                        style={[
                            styles.utilityButton,
                            mode === "lyrics" && styles.activeUtilityButton
                        ]}
                    >
                        <Ionicons
                            name="chatbox-ellipses-outline"
                            size={24}
                            color={
                                !lyricsAvailable
                                    ? "#666"
                                    : mode === "lyrics"
                                        ? "#fff"
                                        : "#ccc"
                            }
                        />
                    </TouchableOpacity>


                    {Platform.OS === "ios" ? (
                        <AirplayButton
                            activeTintColor={themeColor}
                            tintColor={'white'}
                            style={{
                                width: 24,
                                height: 24,
                            }}
                        />
                    ) : (
                        <View style={{ width: 24, height: 24 }} />
                    )}


                    <TouchableOpacity
                        onPress={() => {
                            setMode(mode === "queue" ? "player" : "queue");
                        }}
                        style={[
                            styles.utilityButton,
                            mode === "queue" && styles.activeUtilityButton
                        ]}
                    >
                        <MaterialIcons
                            name="queue-music"
                            size={24}
                            color={mode === "queue" ? '#fff' : '#ccc'}
                        />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
        backgroundColor: '#000'
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeUtilityButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
    },
    coverArt: {
        borderRadius: 10,
        marginBottom: 16,
        shadowColor: '#000', // Shadow color
        shadowOffset: { width: 0, height: 4 }, // Shadow offset for iOS
        shadowOpacity: 0.3, // Shadow opacity for iOS
        shadowRadius: 6, // Shadow radius for iOS
        elevation: 10, // Shadow for Android
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