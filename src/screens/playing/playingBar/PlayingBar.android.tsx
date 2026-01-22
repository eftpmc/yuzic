import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from 'expo-blur';
import { useProgress } from 'react-native-track-player';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSelector } from 'react-redux';
import ImageColors from 'react-native-image-colors';

import PlayingScreen from '@/screens/playing';
import PlayingBackground from '@/screens/playing/components/PlayingBackground';
import { usePlaying } from '@/contexts/PlayingContext';
import { useTheme } from '@/hooks/useTheme';
import { MediaImage } from '../../../components/MediaImage';
import { buildCover } from '@/utils/builders/buildCover';
import {
  selectPlayingBarAction,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { usePlayingBarAction } from './actions/usePlayingBarAction';
import { Toasts } from '@backpackapp-io/react-native-toast';

const PlayingBar: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [appState, setAppState] = useState(AppState.currentState);

  const themeColor = useSelector(selectThemeColor);
  const actionMode = useSelector(selectPlayingBarAction);

  const {
    currentSong,
    isPlaying,
    pauseSong,
    resumeSong,
  } = usePlaying();

  const [currentGradient, setCurrentGradient] = useState<string[]>(['#000', '#000']);
  const [nextGradient, setNextGradient] = useState<string[]>(['#000', '#000']);

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const primaryAction = usePlayingBarAction(actionMode);

  const darkenHexColor = (hex: string, amount = 0.3) => {
    let col = hex.replace('#', '');
    if (col.length === 3) col = col.split('').map(c => c + c).join('');
    const num = parseInt(col, 16);
    const r = Math.floor(((num >> 16) & 0xff) * (1 - amount));
    const g = Math.floor(((num >> 8) & 0xff) * (1 - amount));
    const b = Math.floor((num & 0xff) * (1 - amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)}`;
  };

  const extractColors = async (uri: string) => {
    try {
      const colors = await ImageColors.getColors(uri, { fallback: '#121212' });
      let dominant = '#121212';
      if (colors.platform === 'android') {
        dominant = colors.darkVibrant || colors.dominant || dominant;
      } else {
        dominant = colors.primary || dominant;
      }
      dominant = darkenHexColor(dominant);
      setNextGradient([dominant, '#000']);
    } catch {
      setNextGradient(['#121212', '#000']);
    }
  };

  useEffect(() => {
    if (!currentSong?.cover) return;
    const uri =
      buildCover(currentSong.cover, 'detail') ??
      buildCover({ kind: 'none' }, 'detail');
    if (uri) extractColors(uri);
  }, [currentSong?.id]);

  const playbackProgress = useProgress(500);
  const position = appState === 'active' ? playbackProgress.position : 0;
  const duration = currentSong ? Number(currentSong.duration) : 1;
  const progress = duration > 0 ? position / duration : 0;

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  const handlePlayPause = async () => {
    if (!currentSong) return;
    isPlaying ? await pauseSong() : await resumeSong();
  };

  const handleExpand = () => {
    if (currentSong) bottomSheetRef.current?.present();
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
            <View style={styles.topRow}>
              {currentSong?.cover ? (
                <MediaImage
                  cover={currentSong.cover}
                  size="thumb"
                  style={styles.coverArt}
                />
              ) : (
                <Ionicons
                  name="musical-notes-outline"
                  size={40}
                  style={styles.coverArt}
                  color={isDarkMode ? '#fff' : '#333'}
                />
              )}

              <View style={styles.details}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    isDarkMode ? styles.textDark : styles.textLight,
                  ]}
                >
                  {currentSong?.title || 'No song playing'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.artist,
                    isDarkMode
                      ? styles.textDarkSecondary
                      : styles.textLightSecondary,
                  ]}
                >
                  {currentSong?.artist || 'Select a track to begin'}
                </Text>
              </View>

              {currentSong && (
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={handlePlayPause}
                >
                  <FontAwesome6
                    name={isPlaying ? 'pause' : 'play'}
                    size={20}
                    color={isDarkMode ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
              )}

              {primaryAction && (
                <TouchableOpacity
                  style={[styles.fabButton, { backgroundColor: themeColor }]}
                  onPress={primaryAction.onPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {primaryAction.icon}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.progressBarContainer}>
              {currentSong && (
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: themeColor,
                    },
                  ]}
                />
              )}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['100%']}
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: 'transparent' }}
        backgroundComponent={props => (
          <PlayingBackground
            {...props}
            current={currentGradient}
            next={nextGradient}
            onFadeComplete={() => setCurrentGradient(nextGradient)}
          />
        )}
      >
        <PlayingScreen onClose={() => bottomSheetRef.current?.close()} />

        <Toasts
          defaultStyle={{
            view: {
              backgroundColor: isDarkMode
                ? 'rgba(32,32,32,0.9)'
                : 'rgba(255,255,255,0.9)',
              borderRadius: 10,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 4,
            },
            pressable: {
              backgroundColor: 'transparent',
            },
            text: {
              color: isDarkMode ? '#fff' : '#000',
              fontSize: 16,
              fontWeight: '500',
            },
            indicator: {
              marginRight: 12,
            },
          }}
        />
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
    elevation: 4,
  },
  container: {
    padding: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
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