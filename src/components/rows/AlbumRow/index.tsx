import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';

import { AlbumBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  album: AlbumBase;
  onPress?: (album: AlbumBase) => void;
  /** Replaces the album's own subtext line, e.g. the release year in the
   * artist screen's chronological discography. */
  subtextOverride?: string;
};

const AlbumRow: React.FC<Props> = ({
  album,
  onPress,
  subtextOverride,
}) => {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const handleOptionsPress = useCallback(() => {
    optionsSheetRef.current?.present();
  }, [optionsSheetRef]);

  return (
    <View style={styles.wrapper}>
      <MediaListRow
        title={album.title}
        subtitle={subtextOverride ?? album.subtext}
        cover={album.cover}
        onPress={handlePress}
        trailing={
          <IconActionButton
            icon={<Ellipsis size={24} color={colors.secondary} />}
            onPress={handleOptionsPress}
            accessibilityLabel="Album options"
            size="compact"
          />
        }
        style={styles.row}
      />

      <AlbumOptions
        ref={optionsSheetRef}
        album={album}
        hideGoToAlbum={false}
      />
    </View>
  );
};

export default memo(AlbumRow);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  row: {
    paddingHorizontal: 16,
  },
});
