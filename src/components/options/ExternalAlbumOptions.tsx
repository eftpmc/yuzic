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
import { useTranslation } from 'react-i18next';

interface ExternalAlbumOptionsProps {
  selectedAlbumTitle: string;
  selectedAlbumArtist: string;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({
  selectedAlbumTitle,
  selectedAlbumArtist,
}) => {
  const { t } = useTranslation();
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
      toast.error(t('externalAlbum.download.noDownloader'));
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
          toast.success(t('externalAlbum.download.addedToLidarr'));
        } else {
          toast.error(result.message ?? t('externalAlbum.download.failed'));
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
          toast.success(t('externalAlbum.download.addedToSlskd'));
        } else {
          toast.error(result.message ?? t('externalAlbum.download.failed'));
        }
        return;
      }

      toast.error(t('externalAlbum.download.noDownloader'));
    } catch (e) {
      toast.error(t('externalAlbum.download.startFailed'));
    }
  };

  if (!canDownload) {
    return (
      <TouchableOpacity style={styles.moreButton} onPress={handleDownloadAlbum}>
        <Ionicons
          name="ellipsis-horizontal"
          size={24}
          color={isDarkMode ? '#fff' : '#000'}
        />
      </TouchableOpacity>
    );
  }

  return (
    <MenuView
      title={t('externalAlbum.menu.title')}
      actions={[
        {
          id: 'download-album',
          title: t('externalAlbum.menu.downloadToServer'),
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