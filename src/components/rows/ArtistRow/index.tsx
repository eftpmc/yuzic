import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { Artist } from '@/types';
import ArtistOptions from '@/components/options/ArtistOptions';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSheetRef } from '@/utils/useSheetRef';
import { spacing } from '@/constants/design';

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
        <MediaListRow
          title={artist.name}
          subtitle={artist.subtext === 'Artist' ? t('common.artist') : artist.subtext}
          cover={artist.cover}
          onPress={handlePress}
          roundedCover={rounded}
          trailing={
            <IconActionButton
              icon={<Ellipsis size={24} color={colors.secondary} />}
              onPress={handleOpenOptions}
              accessibilityLabel={t('a11y.rows.options', { title: artist.name })}
              size="compact"
            />
          }
          style={styles.row}
        />
      </View>

      <ArtistOptions ref={sheetRef} artist={artist} />
    </>
  );
};

export default memo(ArtistRow);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  row: {
    paddingHorizontal: spacing.lg,
  },
});
