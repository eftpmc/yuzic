import React from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useAlbum } from '@/hooks/albums';

const AlbumOptions: React.FC<{ selectedAlbumId: string | null }> = ({
  selectedAlbumId,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();

  const { album: selectedAlbum } = useAlbum(selectedAlbumId ?? '');

  const handleGoToAlbum = () => {
    if (!selectedAlbumId) return;

    navigation.navigate('(home)', {
      screen: 'albumView',
      params: { id: selectedAlbumId },
    });
  };

  return (
    <MenuView
      title={selectedAlbum?.title || 'Album Options'}
      actions={[
        {
          id: 'go-to-album',
          title: 'Go to Album',
          image: Platform.select({
            ios: 'music.note.list',
            android: 'ic_music_note',
          }),
          imageColor: '#fff',
        },
      ]}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'go-to-album') {
          handleGoToAlbum();
        }
      }}
    >
      <TouchableOpacity style={styles.moreButton}>
        <Ionicons
          name="ellipsis-horizontal"
          size={24}
          color={isDarkMode ? '#fff' : '#000'}
        />
      </TouchableOpacity>
    </MenuView>
  );
};

export default AlbumOptions;

const styles = StyleSheet.create({
  moreButton: {
    padding: 8,
  },
});