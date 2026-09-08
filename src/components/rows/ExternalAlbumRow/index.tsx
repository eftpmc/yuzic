import React, { memo, useCallback } from 'react';
import { iconSize, statusColor, typography } from '@/constants/design';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Link, ArrowDownCircle } from 'lucide-react-native';

import { ExternalAlbumBase } from '@/types';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import MediaListRow from '@/components/MediaListRow';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';

type Props = {
  album: ExternalAlbumBase;
  onPress?: (album: ExternalAlbumBase) => void;
  /** Replaces the album's own subtext line, e.g. the release year in the
   * artist screen's chronological discography. */
  subtextOverride?: string;
};

const ExternalAlbumRow: React.FC<Props> = ({ album, onPress, subtextOverride }) => {
  const status = useExternalAlbumStatus(album);

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const statusBadge =
    status.kind === 'in_library' ? (
      <Link size={iconSize.badge} color={statusColor.success} />
    ) : status.kind === 'downloading' ? (
      <View style={styles.badge}>
        <ArrowDownCircle size={iconSize.badge} color={statusColor.downloading} />
        <Text style={[styles.badgeText, styles.badgeTextBlue]}>{status.progress}%</Text>
      </View>
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
    ...typography.caption,
    fontWeight: '500',
  },
  badgeTextBlue: {
    color: statusColor.downloading,
  },
});
