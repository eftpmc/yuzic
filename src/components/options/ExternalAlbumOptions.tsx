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
import * as slskd from '@/api/slskd';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
  selectIsLidarrActive,
  selectSlskdConfig,
  selectSlskdAuthenticated,
  selectIsSlskdActive,
} from '@/utils/redux/selectors/downloadersSelectors';
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

  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isLidarrActive = useSelector(selectIsLidarrActive);
  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const isSlskdActive = useSelector(selectIsSlskdActive);

  const canDownload =
    (isLidarrActive && isLidarrConnected) ||
    (isSlskdActive && isSlskdConnected);

  const handleDownloadAlbum = async () => {
    if (!selectedAlbumTitle || !selectedAlbumArtist) return;

    if (!canDownload) {
      toast.error('No active downloader connected.');
      return;
    }

    try {
      if (isLidarrActive && isLidarrConnected) {
        const result = await lidarr.downloadAlbum(
          lidarrConfig,
          selectedAlbumTitle,
          selectedAlbumArtist
        );
        if (result.success) {
          toast.success('Album added to Lidarr!');
        } else {
          toast.error(result.message ?? 'Download failed.');
        }
        return;
      }

      if (isSlskdActive && isSlskdConnected) {
        const result = await slskd.downloadAlbum(
          slskdConfig,
          selectedAlbumTitle,
          selectedAlbumArtist
        );
        if (result.success) {
          toast.success('Album added to slskd queue!');
        } else {
          toast.error(result.message ?? 'Download failed.');
        }
        return;
      }

      toast.error('No active downloader connected.');
    } catch (e) {
      toast.error('Failed to start download.');
    }
  };

  return (
    <MenuView
      title="External Album"
      actions={canDownload ? [
        {
          id: 'download-album',
          title: 'Download to Server',
          image: Platform.select({
            ios: 'arrow.down.circle',
            android: 'ic_download',
          }),
          imageColor: '#fff',
        },
      ] : []}
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