import React, { useMemo, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    StyleSheet,
    Appearance,
    TouchableOpacity,
    Animated,
    Easing,
    Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlaying } from '@/contexts/PlayingContext';
import CoverArt from '@/components/CoverArt';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAI } from '@/contexts/AIContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Loader2 } from 'lucide-react-native';

const PlayerView: React.FC = () => {
    const router = useRouter();
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { input, setInput, generatedQueue, setGeneratedQueue, isLoading, generateQueue } = useAI();
    const {
        playSongInCollection,
        currentSong,
        isPlaying,
        pauseSong,
        resumeSong,
        skipToNext,
        skipToPrevious,
        toggleRepeat,
        toggleShuffle,
        repeatMode,
        shuffleOn
    } = usePlaying();
    const { themeColor, promptHistory, weighting, setWeighting } = useSettings();

    const totalDuration = useMemo(() => {
        const seconds = generatedQueue.reduce((sum, song) => sum + (parseFloat(song.duration) || 0), 0);
        const min = Math.floor(seconds / 60);
        const sec = Math.round(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }, [generatedQueue]);

    const spinValue = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        if (isLoading) {
            // Reset the value first to avoid drift
            spinValue.setValue(0);

            const animation = Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );

            animation.start();

            return () => {
                animation.stop();
                spinValue.stopAnimation();
            };
        }
    }, [isLoading, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark, Platform.OS === 'android' && { paddingTop: 24 }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Player
                </Text>
            </View>


            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <View style={styles.nowPlayingContainer}>
                        <CoverArt source={currentSong?.cover ?? null} size={64} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.songTitle, isDarkMode && styles.labelDark]} numberOfLines={1}>
                                {currentSong?.title || 'Nothing playing'}
                            </Text>
                            <Text style={[styles.meta, isDarkMode && styles.metaDark]} numberOfLines={1}>
                                {currentSong?.artist || '—'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.controlsRow}>
                        <TouchableOpacity onPress={toggleShuffle} disabled={!currentSong}>
                            <MaterialIcons
                                name="shuffle"
                                size={24}
                                color={!currentSong ? '#555' : shuffleOn ? themeColor : isDarkMode ? '#888' : '#aaa'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={skipToPrevious} disabled={!currentSong}>
                            <MaterialIcons name="skip-previous" size={28} color={!currentSong ? '#555' : isDarkMode ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={isPlaying ? pauseSong : resumeSong}
                            disabled={!currentSong}
                            style={[styles.playPauseButton, { backgroundColor: !currentSong ? '#333' : '#444' }]}
                        >
                            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={skipToNext} disabled={!currentSong}>
                            <MaterialIcons name="skip-next" size={28} color={!currentSong ? '#555' : isDarkMode ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleRepeat} disabled={!currentSong}>
                            <MaterialIcons
                                name={repeatMode === 'one' ? 'repeat-one' : 'repeat'}
                                size={24}
                                color={!currentSong ? '#555' : repeatMode !== 'off' ? themeColor : isDarkMode ? '#888' : '#aaa'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                        Last Prompt
                    </Text>
                    <Text style={[styles.promptText, isDarkMode && styles.promptTextDark]}>
                        {input || 'No prompt yet.'}
                    </Text>

                    <Text style={[styles.label, isDarkMode && styles.labelDark, { marginTop: 16 }]}>
                        Generated Queue
                    </Text>
                    <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
                        {generatedQueue.length} songs • {totalDuration}
                    </Text>

                    <TouchableOpacity
                        disabled={isLoading || !input}
                        style={[
                            styles.regenerateButton,
                            isDarkMode ? styles.regenerateButtonDark : styles.regenerateButtonLight,
                            (!input || isLoading) && styles.regenerateButtonDisabled,
                        ]}
                        onPress={() => generateQueue(input)}
                    >
                        <View style={styles.regenerateLeft}>
                            <MaterialIcons name="refresh" size={20} color={isDarkMode ? '#fff' : '#000'} style={{ marginRight: 12 }} />
                            <Text style={[styles.regenerateText, isDarkMode && styles.regenerateTextDark]}>
                                Regenerate Queue
                            </Text>
                        </View>
                        {isLoading ? (
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Loader2 size={18} color={isDarkMode ? '#ccc' : '#666'} />
                            </Animated.View>
                        ) : (
                            <MaterialIcons name="chevron-right" size={20} color={isDarkMode ? '#ccc' : '#666'} />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>Weight Tweaks</Text>
                    <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
                        Global Play Count Weight: {weighting.global.toFixed(1)}
                    </Text>
                    <Slider
                        value={weighting.global}
                        minimumValue={0}
                        maximumValue={5}
                        step={0.1}
                        onValueChange={(val) => setWeighting({ ...weighting, global: val })}
                        minimumTrackTintColor={themeColor}
                        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
                    />
                    <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
                        User Play Count Weight: {weighting.user.toFixed(1)}
                    </Text>
                    <Slider
                        value={weighting.user}
                        minimumValue={0}
                        maximumValue={5}
                        step={0.1}
                        onValueChange={(val) => setWeighting({ ...weighting, user: val })}
                        minimumTrackTintColor={themeColor}
                        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
                    />
                    <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
                        Favorite Song Boost: {weighting.favorite.toFixed(1)}
                    </Text>
                    <Slider
                        value={weighting.favorite}
                        minimumValue={1}
                        maximumValue={5}
                        step={0.1}
                        onValueChange={(val) => setWeighting({ ...weighting, favorite: val })}
                        minimumTrackTintColor={themeColor}
                        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
                    />
                </View>
                {promptHistory.length > 0 && (
                    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                            Prompt History
                        </Text>
                        {promptHistory.map((entry, i) => {
                            const firstCover = entry.queue?.[0]?.cover ?? null;
                            const songCount = entry.queue?.length ?? 0;
                            const durationSec = entry.queue?.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
                            const durationMin = Math.floor(durationSec / 60);
                            const durationStr = `${songCount} song${songCount !== 1 ? 's' : ''} • ${durationMin} min`;

                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => {
                                        if (entry.queue.length > 0) {
                                            playSongInCollection(entry.queue[0], {
                                                id: 'ai-generated',
                                                title: `AI Queue • ${entry.prompt}`,
                                                type: 'playlist',
                                                songs: entry.queue,
                                            });
                                            setInput(entry.prompt);
                                            setGeneratedQueue(entry.queue);
                                        } else {
                                            generateQueue(entry.prompt);
                                        }
                                    }}
                                    style={[
                                        styles.recentPromptRow,
                                        isDarkMode && styles.recentPromptRowDark,
                                        i === 0 && { marginTop: 8 },
                                    ]}
                                >
                                    <CoverArt source={firstCover} size={48} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.recentPromptText, isDarkMode && styles.recentPromptTextDark]}>
                                            {entry.prompt}
                                        </Text>
                                        <Text style={[styles.meta, isDarkMode && styles.metaDark]}>{durationStr}</Text>
                                    </View>
                                    <MaterialIcons name="play-arrow" size={24} color={isDarkMode ? '#ccc' : '#666'} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default PlayerView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
        header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 6,
    },
    headerDark: { 
        // No background, keep it transparent like OpenAI
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
        color: '#000',
    },
    headerTitleDark: {
        color: '#fff',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    sectionDark: {
        backgroundColor: '#111',
    },
    nowPlayingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    songTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 8,
    },
    playPauseButton: {
        backgroundColor: '#444',
        padding: 12,
        borderRadius: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        color: '#000',
    },
    labelDark: { color: '#fff' },
    promptText: {
        fontSize: 15,
        color: '#444',
    },
    promptTextDark: {
        color: '#ccc',
    },
    meta: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    metaDark: {
        color: '#999',
    },
    button: {
        marginTop: 16,
        paddingVertical: 10, // smaller padding
        paddingHorizontal: 16, // optional: add horizontal padding if needed
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14, // slightly smaller
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 16,
        borderWidth: 1,
    },
    regenerateButtonLight: {
        backgroundColor: '#f1f1f1',
        borderColor: '#ddd',
    },
    regenerateButtonDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    regenerateButtonDisabled: {
        opacity: 0.6,
    },
    regenerateLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    regenerateText: {
        fontSize: 15,
        color: '#000',
    },
    regenerateTextDark: {
        color: '#fff',
    },
    recentPromptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#f4f4f4',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    recentPromptRowDark: {
        backgroundColor: '#1c1c1c',
        borderColor: '#333',
    },
    recentPromptItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: '#f4f4f4',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    recentPromptItemDark: {
        backgroundColor: '#1c1c1c',
        borderColor: '#333',
    },
    recentPromptText: {
        fontSize: 14,
        flexShrink: 1,
        color: '#000',
    },
    recentPromptTextDark: {
        color: '#fff',
    },
});