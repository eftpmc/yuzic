import React from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import * as lidarr from '@/api/lidarr';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
} from '@/utils/redux/selectors/lidarrSelectors';
import { useTheme } from '@/hooks/useTheme';

interface ExternalAlbumOptionsProps {
  selectedAlbumTitle: string;
  selectedAlbumArtist: string;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({
  selectedAlbumTitle,
  selectedAlbumArtist,
}) => {
  const { isDarkMode } = useTheme();

  const config = useSelector(selectLidarrConfig);
  const isAuthenticated = useSelector(selectLidarrAuthenticated);

  const handleDownloadAlbum = async () => {
    if (!selectedAlbumTitle || !selectedAlbumArtist) return;

    if (!isAuthenticated) {
      toast.error('Lidarr is not connected.');
      return;
    }

    try {
      const result = await lidarr.downloadAlbum(
        config,
        selectedAlbumTitle,
        selectedAlbumArtist
      );

      if (result.success) {
        toast.success('Album added to Lidarr!');
      } else {
        toast.error(result.message ?? 'Download failed.');
      }
    } catch (e) {
      toast.error('Failed to start download.');
    }
  };

  return (
    <MenuView
      title="External Album"
      actions={[
        {
          id: 'download-album',
          title: 'Download to Server',
          image: Platform.select({
            ios: 'arrow.down.circle',
            android: 'ic_download',
          }),
          imageColor: '#fff',
        },
      ]}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'download-album') {
          handleDownloadAlbum();
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

export default ExternalAlbumOptions;

const styles = StyleSheet.create({
  moreButton: {
    padding: 8,
  },
});