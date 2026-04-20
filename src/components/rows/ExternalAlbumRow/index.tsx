import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const { isDarkMode } = useTheme();
  const status = useExternalAlbumStatus(album);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={() => onPress?.(album)}
        >
          <MediaImage cover={album.cover} size="thumb" style={styles.cover} />

          <View style={styles.albumTextContainer}>
            <Text
              numberOfLines={1}
              style={[styles.albumTitle, isDarkMode && styles.albumTitleDark]}
            >
              {album.title}
            </Text>

            <View style={styles.subtextRow}>
              <Text
                numberOfLines={1}
                style={[styles.albumSubtext, isDarkMode && styles.albumSubtextDark, styles.subtextFlex]}
              >
                {album.subtext}
              </Text>

              {status.kind === 'in_library' && (
                <View style={styles.badge}>
                  <Ionicons name="link" size={12} color="#34C759" />
                  <Text style={styles.badgeText}>MusicBrainz</Text>
                </View>
              )}
              {status.kind === 'downloading' && (
                <View style={styles.badge}>
                  <Ionicons name="arrow-down-circle" size={12} color="#007AFF" />
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

export default ExternalAlbumRow;

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
    fontWeight: '600',
    color: '#000',
  },
  albumTitleDark: {
    color: '#fff',
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
    color: '#666',
  },
  albumSubtextDark: {
    color: '#aaa',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  badgeTextBlue: {
    color: '#007AFF',
  },
});
