import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { Artist } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  artist: Artist;
  onPress?: (artist: Artist) => void;
  rounded?: boolean;
};

const ArtistRow: React.FC<Props> = ({ artist, onPress, rounded = false }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const sheetRef = useSheetRef();

  const handlePress = useCallback(() => onPress?.(artist), [onPress, artist]);

  const handleOpenOptions = useCallback(() => {
    sheetRef.current?.present();
  }, [sheetRef]);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.rowItem}>
          <TouchableOpacity
            style={styles.rowContent}
            onPress={handlePress}
          >
            <MediaImage
              cover={artist.cover}
              size="grid"
              style={[styles.cover, rounded && styles.coverRounded]}
            />

            <View style={styles.textContainer}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: colors.secondary }]}
              >
                {artist.name}
              </Text>

              <Text
                numberOfLines={1}
                style={[styles.subtext, { color: colors.subtext }]}
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
              <Ellipsis
                size={24}
                color={colors.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ArtistOptions ref={sheetRef} artist={artist} />
    </>
  );
};

export default memo(ArtistRow);

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
    fontWeight: '500',
  },
  subtext: {
    fontSize: 14,
    marginTop: 2,
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});
