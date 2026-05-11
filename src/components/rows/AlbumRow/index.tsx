import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { Album } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useApi } from '@/api';
import { useSheetRef } from '@/utils/useSheetRef';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { staleTime } from '@/constants/staleTime';

type Props = {
  album: Album;
  onPress?: (album: Album) => void;
};

const AlbumRow: React.FC<Props> = ({
  album,
  onPress,
}) => {
  const { isDarkMode } = useTheme();
  const optionsSheetRef = useSheetRef();
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const [fullAlbum, setFullAlbum] = useState<Album | null>(null);

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const handleOptionsPress = useCallback(async () => {
    optionsSheetRef.current?.present();
    if (!fullAlbum) {
      const fetched = await queryClient.fetchQuery<Album>({
        queryKey: [QueryKeys.Album, activeServer?.id, album.id],
        queryFn: () => api.albums.get(album.id),
        staleTime: staleTime.albums,
      });
      setFullAlbum(fetched);
    }
  }, [album.id, fullAlbum, queryClient, activeServer?.id, api, optionsSheetRef]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={handlePress}
        >
          <MediaImage
            cover={album.cover}
            size="grid"
            style={styles.cover}
          />

          <View style={styles.albumTextContainer}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.albumTitle,
                  isDarkMode && styles.albumTitleDark,
                ]}
              >
                {album.title}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.albumSubtext,
                isDarkMode && styles.albumSubtextDark,
              ]}
            >
              {album.subtext}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={handleOptionsPress}
            style={styles.optionButton}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <AlbumOptions
        ref={optionsSheetRef}
        album={fullAlbum ?? album}
        hideGoToAlbum={false}
      />
    </View>
  );
};

export default memo(AlbumRow);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  albumTitleDark: {
    color: '#fff',
  },
  albumSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  albumSubtextDark: {
    color: '#aaa',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});
