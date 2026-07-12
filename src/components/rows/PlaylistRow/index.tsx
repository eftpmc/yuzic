import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';

import { PlaylistBase } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import PlaylistOptions from '@/components/options/PlaylistOptions';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  playlist: PlaylistBase;
  onPress?: (playlist: PlaylistBase) => void;
};

const PlaylistRow: React.FC<Props> = ({ playlist, onPress }) => {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  const handlePress = useCallback(() => onPress?.(playlist), [onPress, playlist]);

  const handleOptionsPress = useCallback(() => {
    optionsSheetRef.current?.present();
  }, [optionsSheetRef]);

  return (
    <View style={styles.wrapper}>
      <MediaListRow
        title={playlist.title}
        subtitle={playlist.subtext}
        cover={playlist.cover}
        onPress={handlePress}
        trailing={
          <IconActionButton
            icon={<Ellipsis size={24} color={colors.secondary} />}
            onPress={handleOptionsPress}
            accessibilityLabel="Playlist options"
            size="compact"
          />
        }
        style={styles.row}
      />

      <PlaylistOptions
        ref={optionsSheetRef}
        playlist={playlist}
        hideGoToPlaylist={false}
      />
    </View>
  );
};

export default memo(PlaylistRow);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  row: {
    paddingHorizontal: 16,
  },
});
