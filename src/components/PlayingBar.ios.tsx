import React, { useState, useEffect, useRef } from 'react';
import {
    AppState,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    Animated,
    TextInput,
    Easing,
} from 'react-native';
import { toast, Toasts } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from 'expo-blur';
import { useProgress } from 'react-native-track-player';
import PlayingScreen from '@/screens/playing';
import { usePlaying } from '@/contexts/PlayingContext';
import { useAI } from '@/contexts/AIContext';
import { Loader2 } from 'lucide-react-native';
import {
    BottomSheetModal
} from '@gorhom/bottom-sheet';

import {
    selectActiveAiApiKey,
    selectAiButtonEnabled,
    selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { useSelector } from 'react-redux';
import { MediaImage } from './MediaImage';
import { useTheme } from '@/hooks/useTheme';
import ImageColors from 'react-native-image-colors';
import { buildCover } from '@/utils/builders/buildCover';
import PlayingBackground from '@/screens/playing/components/PlayingBackground';

const PlayingBar: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [appState, setAppState] = useState(AppState.currentState);
    const themeColor = useSelector(selectThemeColor);
    const aiApiKey = useSelector(selectActiveAiApiKey);
    const aiButtonEnabled = useSelector(selectAiButtonEnabled);
    const { generateQueue, isLoading } = useAI();
    const [inputValue, setInputValue] = useState('');
    const { currentSong, isPlaying, pauseSong, resumeSong } = usePlaying();
    const [currentGradient, setCurrentGradient] = useState<string[]>(["#000", "#000"]);
    const [nextGradient, setNextGradient] = useState<string[]>(["#000", "#000"]);

    const darkenHexColor = (hex: string, amount = 0.3) => {
        let col = hex.replace("#", "");
        if (col.length === 3) col = col.split("").map(c => c + c).join("");

        const num = parseInt(col, 16);
        const r = Math.floor(((num >> 16) & 0xff) * (1 - amount));
        const g = Math.floor(((num >> 8) & 0xff) * (1 - amount));
        const b = Math.floor((num & 0xff) * (1 - amount));

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const extractColors = async (uri: string) => {
        try {
            const colors = await ImageColors.getColors(uri, {
                fallback: "#121212",
            });

            let dominant = "#121212";
            if (colors.platform === "android") {
                dominant = colors.darkVibrant || colors.dominant || dominant;
            } else {
                dominant = colors.primary || dominant;
            }

            dominant = darkenHexColor(dominant);
            setNextGradient([dominant, "#000"]);
        } catch {
            setNextGradient(["#121212", "#000"]);
        }
    };

    useEffect(() => {
        if (!currentSong?.cover) return;

        const uri =
            buildCover(currentSong.cover, "detail") ??
            buildCover({ kind: "none" }, "detail");

        if (uri) extractColors(uri);
    }, [currentSong?.id]);

    const playbackProgress = useProgress(500);
    const position = appState === 'active' ? playbackProgress.position : 0;
    const duration = currentSong ? Number(currentSong.duration) : 1;
    const progress = duration > 0 ? position / duration : 0;

    const inputRef = useRef<TextInput>(null);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [inputMode, setInputMode] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const inputFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const subscription = AppState.addEventListener('change', setAppState);
        return () => subscription.remove();
    }, []);

    const handlePlayPause = async () => {
        if (currentSong) {
            isPlaying ? await pauseSong() : await resumeSong();
        }
    };

    const handleExpand = () => {
        if (currentSong && !inputMode) {
            bottomSheetModalRef.current?.present();
        }
    };

    const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isLoading) {
            if (!spinLoopRef.current) {
                spinLoopRef.current = Animated.loop(
                    Animated.timing(spinAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                );
                spinLoopRef.current.start();
            }
        } else {
            if (spinLoopRef.current) {
                spinLoopRef.current.stop();
                spinAnim.setValue(0);
                spinLoopRef.current = null;
            }
        }
    }, [isLoading]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleToggleInput = () => {
        if (!aiApiKey) {
            toast.error('Please enter your AI API key in Settings > Plugins.');
            return;
        }

        setInputMode(true);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(inputFadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubmitInput = async () => {
        if (!inputValue.trim()) return;
        await generateQueue(inputValue);
        inputRef.current?.blur();
        setInputValue('');
        handleCloseInput();
    };

    const handleCloseInput = () => {
        inputRef.current?.blur();

        Animated.parallel([
            Animated.timing(inputFadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setInputMode(false);
        });
    };

    return (
        <>
            <TouchableOpacity onPress={handleExpand} activeOpacity={inputMode ? 1 : 0.9} disabled={inputMode}>
                <View style={styles.wrapper}>
                    <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.container}>
                        <View style={styles.topRowWrapper}>
                            <Animated.View
                                pointerEvents={inputMode ? 'none' : 'auto'}
                                style={[styles.topRow, { opacity: fadeAnim, zIndex: 0 }]}
                            >
                                {currentSong?.cover ? (
                                    <MediaImage cover={currentSong.cover} size="thumb" style={styles.coverArt} />
                                ) : (
                                    <Ionicons
                                        name="musical-notes-outline"
                                        size={40}
                                        style={styles.coverArt}
                                        color={isDarkMode ? '#fff' : '#333'}
                                    />
                                )}
                                <View style={styles.details}>
                                    <Text numberOfLines={1} style={[styles.title, isDarkMode ? styles.textDark : styles.textLight]}>
                                        {currentSong?.title || 'No song playing'}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.artist, isDarkMode ? styles.textDarkSecondary : styles.textLightSecondary]}
                                    >
                                        {currentSong?.artist || 'Select a track to begin'}
                                    </Text>
                                </View>
                                {currentSong && (
                                    <TouchableOpacity
                                        style={styles.playPauseButton}
                                        onPress={handlePlayPause}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <FontAwesome6
                                            name={isPlaying ? 'pause' : 'play'}
                                            size={20}
                                            color={isDarkMode ? '#fff' : '#000'}
                                        />
                                    </TouchableOpacity>
                                )}
                                {aiButtonEnabled && (
                                    <TouchableOpacity
                                        style={[styles.fabButton, { backgroundColor: themeColor }]}
                                        onPress={handleToggleInput}
                                    >
                                        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </Animated.View>

                            <Animated.View
                                pointerEvents={inputMode ? 'auto' : 'none'}
                                style={[styles.topRow, styles.inputOverlay, { opacity: inputFadeAnim, zIndex: 1 }]}
                            >
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        ref={inputRef}
                                        editable={inputMode}
                                        focusable={inputMode}
                                        value={inputValue}
                                        onChangeText={setInputValue}
                                        placeholder="Play alternative and chill rap..."
                                        placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
                                        style={[
                                            styles.input,
                                            isDarkMode ? styles.textDark : styles.textLight,
                                            { color: isDarkMode ? '#fff' : '#000' },
                                        ]}
                                        returnKeyType="done"
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.fabButton, { backgroundColor: themeColor }]}
                                    onPress={inputValue.trim() ? handleSubmitInput : handleCloseInput}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <Loader2 size={18} color="#fff" />
                                        </Animated.View>
                                    ) : (
                                        <Ionicons
                                            name={inputValue.trim() ? 'checkmark' : 'close'}
                                            size={20}
                                            color="#fff"
                                        />
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        <View style={styles.progressBarContainer}>
                            {currentSong && (
                                <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: themeColor }]} />
                            )}
                        </View>
                    </BlurView>
                </View>
            </TouchableOpacity>

            <BottomSheetModal ref={bottomSheetModalRef} snapPoints={['100%']} enableDynamicSizing={false} backgroundStyle={{ backgroundColor: 'transparent' }} backgroundComponent={(props) => (
                <PlayingBackground
                    {...props}
                    current={currentGradient}
                    next={nextGradient}
                    onFadeComplete={() => {
                        setCurrentGradient(nextGradient);
                    }}
                />
            )}>
                <PlayingScreen onClose={() => bottomSheetModalRef.current?.close()} />
            </BottomSheetModal>
        </>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        margin: 12,
        marginBottom: 24,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    container: {
        flexDirection: 'column',
        padding: 10,
        paddingBottom: 6,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    topRowWrapper: {
        position: 'relative',
        height: 50,
        justifyContent: 'center',
    },
    topRow: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        top: 0,
        left: 0,
        right: 0,
        minHeight: 50,
        paddingRight: 4,
    },
    inputOverlay: {
        alignItems: 'center',
        paddingRight: 4,
    },
    coverArt: {
        width: 45,
        height: 45,
        borderRadius: 5,
        marginRight: 12,
    },
    details: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
    },
    artist: {
        fontSize: 14,
        marginTop: 2,
    },
    textLight: {
        color: '#000',
    },
    textDark: {
        color: '#fff',
    },
    textLightSecondary: {
        color: '#666',
    },
    textDarkSecondary: {
        color: '#aaa',
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#666',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
    },
    playPauseButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    fabButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    inputWrapper: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 12,
    },
    input: {
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        height: 40,
        lineHeight: 18,
        textAlignVertical: 'center',
    },
});

export default PlayingBar;