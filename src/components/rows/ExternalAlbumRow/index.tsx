import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Link, ArrowDownCircle } from 'lucide-react-native';

import { ExternalAlbumBase } from '@/types';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';

type Props = {
  album: ExternalAlbumBase;
  artistName: string;
  onPress?: (album: ExternalAlbumBase) => void;
};

const ExternalAlbumRow: React.FC<Props> = ({ album, artistName, onPress }) => {
  const { colors } = useTheme();
  const status = useExternalAlbumStatus(album);

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={handlePress}
        >
          <MediaImage cover={album.cover} size="thumb" style={styles.cover} />

          <View style={styles.albumTextContainer}>
            <Text
              numberOfLines={1}
              style={[styles.albumTitle, { color: colors.secondary }]}
            >
              {album.title}
            </Text>

            <View style={styles.subtextRow}>
              <Text
                numberOfLines={1}
                style={[styles.albumSubtext, { color: colors.subtext }, styles.subtextFlex]}
              >
                {album.subtext}
              </Text>

              {status.kind === 'in_library' && (
                <Link size={14} color="#34C759" />
              )}
              {status.kind === 'downloading' && (
                <View style={styles.badge}>
                  <ArrowDownCircle size={12} color="#007AFF" />
                  <Text style={[styles.badgeText, styles.badgeTextBlue]}>{status.progress}%</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <ExternalAlbumOptions album={album} />
      </View>
    </View>
  );
};

export default memo(ExternalAlbumRow);

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
  albumTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  subtextFlex: {
    flex: 1,
  },
  albumSubtext: {
    fontSize: 14,
  },
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
