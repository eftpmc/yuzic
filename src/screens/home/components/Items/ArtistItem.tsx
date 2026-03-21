import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { CoverSource, Artist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ArtistOptions from '@/components/options/ArtistOptions';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';

interface ItemProps {
  id: string;
  name: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const ArtistItem: React.FC<ItemProps> = ({
  id,
  name,
  subtext,
  cover,
  isGridView,
  gridWidth,
  gridSpacing = 8,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [artistForSheet, setArtistForSheet] = useState<Artist | null>(null);

  const handleNavigation = useCallback(() => {
    navigation.navigate('artistView', { id });
  }, [navigation, id]);

  const fetchArtist = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Artist, activeServer?.id, id],
      queryFn: () => api.artists.get(id),
      staleTime: staleTime.artists,
    });
  }, [api, queryClient, activeServer?.id, id]);

  const handleLongPress = useCallback(async () => {
    const artist = await fetchArtist();
    if (!artist) return;
    setArtistForSheet(artist);
    sheetRef.current?.present();
  }, [fetchArtist]);

  return (
    <>
      <Pressable
        onPress={handleNavigation}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          isGridView
            ? [styles.gridItemContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing }]
            : styles.itemContainer,
          pressed && styles.pressed,
        ]}
      >
        <MediaImage
          cover={cover}
          size={isGridView ? 'grid' : 'thumb'}
          style={
            isGridView
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
              : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
          }
        />

        <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[styles.subtext, isDarkMode && styles.subtextDark]}
            numberOfLines={1}
          >
            {subtext}
          </Text>
        </View>

        {!isGridView && (
          <TouchableOpacity
            onPress={() => { void handleLongPress(); }}
            hitSlop={10}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        )}
      </Pressable>

      <ArtistOptions
        ref={sheetRef}
        artist={artistForSheet}
        hideGoToArtist={false}
      />
    </>
  );
};

export default ArtistItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  gridItemContainer: {
    alignItems: 'flex-start',
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 4,
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
});