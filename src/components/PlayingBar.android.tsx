import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import Dialog from 'react-native-dialog';
import { toast } from '@backpackapp-io/react-native-toast';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from 'expo-blur';
import { useProgress } from 'react-native-track-player';
import PlayingScreen from '@/screens/playing';
import { usePlaying } from '@/contexts/PlayingContext';
import { useAI } from '@/contexts/AIContext';
import { Loader2 } from 'lucide-react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import {
  selectAiButtonEnabled,
  selectActiveAiApiKey,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { useSelector } from 'react-redux';
import { MediaImage } from './MediaImage';
import { useTheme } from '@/hooks/useTheme';

const PlayingBar: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [appState, setAppState] = useState(AppState.currentState);

  const themeColor = useSelector(selectThemeColor);
  const aiApiKey = useSelector(selectActiveAiApiKey);
  const aiButtonEnabled = useSelector(selectAiButtonEnabled);

  const { currentSong, isPlaying, pauseSong, resumeSong } = usePlaying();
  const { generateQueue, isLoading } = useAI();

  const playbackProgress = useProgress(500);
  const position = appState === 'active' ? playbackProgress.position : 0;
  const duration = currentSong ? Number(currentSong.duration) : 1;
  const progress = duration > 0 ? position / duration : 0;

  const bottomSheetRef = useRef<BottomSheet>(null);
  const { height: screenHeight } = useWindowDimensions();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  const handlePlayPause = async () => {
    if (currentSong) {
      isPlaying ? await pauseSong() : await resumeSong();
    }
  };

  const handleExpand = () => {
    if (currentSong) {
      bottomSheetRef.current?.show();
    }
  };

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
      spinAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [isLoading]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleAIPress = () => {
    if (!aiApiKey) {
      toast.error('Please enter your AI API key in Settings > Plugins.');
      return;
    }
    setDialogVisible(true);
  };

  const handleSubmitPrompt = async () => {
    if (!promptText.trim()) return;
    setDialogVisible(false);
    await generateQueue(promptText);
    setPromptText('');
  };

  return (
    <>
      <TouchableOpacity onPress={handleExpand} activeOpacity={0.9}>
        <View style={styles.wrapper}>
          <BlurView
            intensity={isDarkMode ? 140 : 100}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.container}
          >
            <View style={styles.topRowWrapper}>
              <View style={styles.topRow}>
                {currentSong?.cover ? (
                  <MediaImage cover={currentSong.cover} size='thumb' style={styles.coverArt} />
                ) : (
                  <Ionicons name="musical-notes-outline" size={40} style={styles.coverArt} color={isDarkMode ? '#fff' : '#333'} />
                )}

                <View style={styles.details}>
                  <Text
                    numberOfLines={1}
                    style={[styles.title, isDarkMode ? styles.textDark : styles.textLight]}
                  >
                    {currentSong?.title || 'No song playing'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.artist,
                      isDarkMode ? styles.textDarkSecondary : styles.textLightSecondary,
                    ]}
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
                    onPress={handleAIPress}
                  >
                    {isLoading ? (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Loader2 size={18} color="#fff" />
                      </Animated.View>
                    ) : (
                      <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              {currentSong && (
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progress * 100}%`, backgroundColor: themeColor },
                  ]}
                />
              )}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>

      {/* AI PROMPT DIALOG (ANDROID ONLY) */}
      <Dialog.Container visible={dialogVisible}>
        <Dialog.Title>Play something</Dialog.Title>
        <Dialog.Description>
          Describe what you want to hear
        </Dialog.Description>
        <Dialog.Input
          placeholder="Alternative chill rap…"
          value={promptText}
          onChangeText={setPromptText}
        />
        <Dialog.Button label="Cancel" onPress={() => setDialogVisible(false)} />
        <Dialog.Button label="Play" onPress={handleSubmitPrompt} />
      </Dialog.Container>

      <BottomSheet
        ref={bottomSheetRef}
        height={screenHeight}
        sheetBackgroundColor="transparent"
        draggable
      >
        <PlayingScreen onClose={() => bottomSheetRef.current?.close()} />
      </BottomSheet>
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
    height: 50,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
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
  textLight: { color: '#000' },
  textDark: { color: '#fff' },
  textLightSecondary: { color: '#666' },
  textDarkSecondary: { color: '#aaa' },
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
    marginRight: 4,
  },
  fabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});

export default PlayingBar;