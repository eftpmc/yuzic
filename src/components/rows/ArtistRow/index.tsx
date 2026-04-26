import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useApi } from '@/api';
import { Artist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import { useTranslation } from 'react-i18next';

type Props = {
  artist: Artist;
  onPress?: (artist: Artist) => void;
  rounded?: boolean;
};

const ArtistRow: React.FC<Props> = ({ artist, onPress, rounded = false }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const api = useApi();

  const sheetRef = useRef<BottomSheetModal>(null) as unknown as React.RefObject<BottomSheetModal>;
  const [fullArtist, setFullArtist] = useState<Artist | null>(null);

  const activeServer = useSelector(selectActiveServer);

  const fetchArtist = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Artist, activeServer?.id, artist.id],
      queryFn: () => api.artists.get(artist.id),
      staleTime: staleTime.artists,
    });
  }, [api, queryClient, activeServer?.id, artist.id]);

  const handleOpenOptions = useCallback(async () => {
    setFullArtist(null);
    sheetRef.current?.present();
    const fetched = await fetchArtist();
    if (fetched) setFullArtist(fetched);
  }, [fetchArtist]);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.rowItem}>
          <TouchableOpacity
            style={styles.rowContent}
            onPress={() => onPress?.(artist)}
          >
            <MediaImage
              cover={artist.cover}
              size="grid"
              style={[styles.cover, rounded && styles.coverRounded]}
            />

            <View style={styles.textContainer}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  isDarkMode && styles.titleDark,
                ]}
              >
                {artist.name}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.subtext,
                  isDarkMode && styles.subtextDark,
                ]}
              >
                {artist.subtext === 'Artist' ? t('common.artist') : artist.subtext}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              onPress={handleOpenOptions}
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
      </View>

      <ArtistOptions ref={sheetRef} artist={fullArtist} />
    </>
  );
};

export default ArtistRow;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  coverRounded: {
    borderRadius: 32,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subtextDark: {
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
