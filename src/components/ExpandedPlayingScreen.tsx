import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Platform,
    StatusBar,
    SafeAreaView,
    Dimensions,
    AppState,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { usePlaying } from '@/contexts/PlayingContext';
import ImageColors from 'react-native-image-colors';
import { useNavigation } from "@react-navigation/native";
import { Image } from 'expo-image';
import SongOptions from './options/SongOptions';
import Queue from './Queue';
import BackgroundGradient from './BackgroundGradient';
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

interface ExpandedPlayingScreenProps {
    onClose: () => void;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const ExpandedPlayingScreen: React.FC<ExpandedPlayingScreenProps> = ({
    onClose,
}) => {
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const isDarkMode = colorScheme === 'dark';
    const { position } = useProgress();
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
    const { artists } = useLibrary();
    const themeColor = useSelector(selectThemeColor);
    const [currentGradient, setCurrentGradient] = useState(['#000', '#000']);
    const [nextGradient, setNextGradient] = useState(['#000', '#000']);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);
    const [showQueue, setShowQueue] = useState(false);

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

    const queueOpacity = useSharedValue(showQueue ? 1 : 0);
    const playerOpacity = useSharedValue(showQueue ? 0 : 1);

    useEffect(() => {
        queueOpacity.value = withTiming(showQueue ? 1 : 0, { duration: 300 });
        playerOpacity.value = withTiming(showQueue ? 0 : 1, { duration: 300 });
    }, [showQueue]);

    const animatedQueueStyle = useAnimatedStyle(() => ({
        opacity: queueOpacity.value,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    const animatedPlayerStyle = useAnimatedStyle(() => ({
        opacity: playerOpacity.value,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    const toggleQueue = () => {
        setShowQueue((prev) => !prev);
    };

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

            <SafeAreaView style={[
                styles.container
            ]}>
                <StatusBar
                    barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                    backgroundColor="transparent"
                    translucent
                />
                <Animated.View
                    style={[animatedQueueStyle, { alignItems: 'center', justifyContent: 'flex-start' }]}
                    pointerEvents={showQueue ? 'auto' : 'none'}
                >
                    <Queue onBack={() => setShowQueue(false)} width={layoutWidth} />
                </Animated.View>
                <Animated.View
                    style={[animatedPlayerStyle, { alignItems: 'center', justifyContent: 'center' }]}
                    pointerEvents={showQueue ? 'none' : 'auto'}
                >
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                                <SongOptions selectedSong={currentSong} />
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
                                setIsSeeking(true);
                                setSeekPosition(value);
                            }}
                            onSlidingComplete={async (value) => {
                                setIsSeeking(false);
                                await TrackPlayer.seekTo(value);
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
                    <TouchableOpacity onPress={() => console.log('Lyrics')} style={styles.utilityButton}>
                        <Ionicons name="chatbox-ellipses-outline" size={24} color="#ccc" />
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
                        onPress={toggleQueue}
                        style={[
                            styles.utilityButton,
                            showQueue && styles.activeUtilityButton
                        ]}
                    >
                        <MaterialIcons
                            name="queue-music"
                            size={24}
                            color={showQueue ? '#fff' : '#ccc'}
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
        fontSize: 18,
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
        top: Platform.OS === 'ios' ? 60 : 32,
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

export default ExpandedPlayingScreen;