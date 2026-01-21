import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { Song } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { ListEnd, ListStart, PlusCircle } from 'lucide-react-native';
import { useStarredSongs, useStarSong, useUnstarSong } from '@/hooks/starred';

type SongOptionsProps = {
  selectedSong: Song;
  onAddToPlaylist: () => void;
};

const SongOptions = forwardRef<BottomSheetModal, SongOptionsProps>(
  ({ selectedSong, onAddToPlaylist }, ref) => {
    const { isDarkMode } = useTheme();
    const themeStyles = isDarkMode ? stylesDark : stylesLight;

    const snapPoints = useMemo(() => ['55%'], []);

    const { currentSong, addToQueue, playNext } = usePlaying();

    const { songs: starredSongs } = useStarredSongs();
    const starSong = useStarSong();
    const unstarSong = useUnstarSong();

    const isStarred = starredSongs.some(
      s => s.id === selectedSong.id
    );

    const close = () => {
      (ref as any)?.current?.dismiss();
    };

    const toggleFavorite = async () => {
      try {
        if (isStarred) {
          await unstarSong.mutateAsync(selectedSong.id);
          toast.success(`${selectedSong.title} removed from favorites.`);
        } else {
          await starSong.mutateAsync(selectedSong.id);
          toast.success(`${selectedSong.title} added to favorites.`);
        }
      } catch {
        toast.error('Failed to update favorites.');
      } finally {
        close();
      }
    };

    const handleAddToEndQueue = async () => {
      if (!currentSong) {
        toast.error('Nothing is currently playing.');
        return;
      }

      if (selectedSong.id === currentSong.id) {
        toast.error(`${selectedSong.title} is already playing.`);
        return;
      }

      try {
        await addToQueue(selectedSong);
        toast.success(`${selectedSong.title} added to queue.`);
      } catch {
        toast.error('Failed to add to queue.');
      } finally {
        close();
      }
    };

    const handleAddToQueue = async () => {
      if (!currentSong) {
        toast.error('Nothing is currently playing.');
        return;
      }

      if (selectedSong.id === currentSong.id) {
        toast.error(`${selectedSong.title} is already playing.`);
        return;
      }

      try {
        await playNext(selectedSong);
        toast.success(`${selectedSong.title} will play next.`);
      } catch {
        toast.error('Failed to queue song next.');
      } finally {
        close();
      }
    };

    const handleAddToPlaylist = () => {
      close();
      requestAnimationFrame(onAddToPlaylist);
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={[
          styles.sheetBackground,
          themeStyles.sheetBackground,
        ]}
        stackBehavior='push'
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.header}>
            <MediaImage
              cover={selectedSong.cover}
              size="grid"
              style={styles.cover}
            />
            <View style={styles.headerText}>
              <Text
                style={[styles.title, themeStyles.title]}
                numberOfLines={1}
              >
                {selectedSong.title}
              </Text>
              <Text
                style={[styles.artist, themeStyles.artist]}
                numberOfLines={1}
              >
                {selectedSong.artist || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.option}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isStarred ? 'heart' : 'heart-outline'}
              size={26}
              color="#ff3b30"
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {isStarred ? 'Unfavorite' : 'Favorite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToQueue}
          >
            <ListStart
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              Add to Queue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToEndQueue}
          >
            <ListEnd
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              Add to End
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToPlaylist}
          >
            <PlusCircle
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              Add to Playlist
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default SongOptions;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    backgroundColor: '#999',
  },
  sheetContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionText: {
    marginLeft: 16,
    fontSize: 16,
  },
});

const stylesLight = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#F2F2F7',
  },
  title: {
    color: '#000',
  },
  artist: {
    color: '#666',
  },
  optionText: {
    color: '#000',
  },
  icon: {
    color: '#000',
  },
});

const stylesDark = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#222',
  },
  title: {
    color: '#fff',
  },
  artist: {
    color: '#aaa',
  },
  optionText: {
    color: '#fff',
  },
  icon: {
    color: '#999',
  },
});