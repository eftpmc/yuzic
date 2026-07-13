import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Link, ArrowDownCircle, Cloud } from 'lucide-react-native';

import { ExternalAlbumBase } from '@/types';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import MediaListRow from '@/components/MediaListRow';
import { useTheme } from '@/hooks/useTheme';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';

type Props = {
  album: ExternalAlbumBase;
  onPress?: (album: ExternalAlbumBase) => void;
  /** Show a "not in your library" glyph for the common case (status.kind === 'none').
   * Only meaningful where local and external rows can appear side by side in
   * the same list — e.g. the merged Discography — since elsewhere (Search's
   * source-grouped results) every row is already known to be external. */
  showExternalBadge?: boolean;
  /** Replaces the album's own subtext line, e.g. the release year in the
   * artist screen's chronological discography. */
  subtextOverride?: string;
};

const ExternalAlbumRow: React.FC<Props> = ({ album, onPress, showExternalBadge, subtextOverride }) => {
  const { colors } = useTheme();
  const status = useExternalAlbumStatus(album);

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const statusBadge =
    status.kind === 'in_library' ? (
      <Link size={14} color="#34C759" />
    ) : status.kind === 'downloading' ? (
      <View style={styles.badge}>
        <ArrowDownCircle size={12} color="#007AFF" />
        <Text style={[styles.badgeText, styles.badgeTextBlue]}>{status.progress}%</Text>
      </View>
    ) : status.kind === 'none' && showExternalBadge ? (
      <Cloud size={14} color={colors.subtext} />
    ) : null;

  return (
    <MediaListRow
      title={album.title}
      subtitle={subtextOverride ?? album.subtext}
      subtitleTrailing={statusBadge}
      cover={album.cover}
      onPress={handlePress}
      trailing={<ExternalAlbumOptions album={album} />}
    />
  );
};

export default memo(ExternalAlbumRow);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeTextBlue: {
    color: '#007AFF',
  },
});
