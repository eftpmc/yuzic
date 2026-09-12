import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ellipsis, Link, ArrowDownCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AlbumBase, ExternalAlbumBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import { iconSize, spacing, statusColor, typography } from '@/constants/design';

export type AlbumRowAlbum = AlbumBase | ExternalAlbumBase;

/**
 * True when `album` came from an external catalog (Deezer/etc) rather than
 * the user's library. `ExternalAlbumBase.artist` is a plain string, while a
 * library `AlbumBase.artist` is always an `ArtistRef` object — that shape
 * difference is guaranteed to hold for both types, so it doubles as the
 * discriminator without needing a new field on either type.
 */
export function isExternalAlbum(album: AlbumRowAlbum): album is ExternalAlbumBase {
  return typeof album.artist === 'string';
}

type Props = {
  album: AlbumRowAlbum;
  onPress?: (album: AlbumRowAlbum) => void;
  /** Replaces the album's own subtext line, e.g. the release year in the
   * artist screen's chronological discography. */
  subtextOverride?: string;
};

const AlbumRow: React.FC<Props> = ({
  album,
  onPress,
  subtextOverride,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  // Disabled (no-op) for library albums — useExternalAlbumStatus already
  // guards all its queries on the album argument being non-null, so this
  // stays a no-op for plain library rows exactly as it did before the two
  // row components were merged.
  const status = useExternalAlbumStatus(isExternalAlbum(album) ? album : null);

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const handleOptionsPress = useCallback(() => {
    optionsSheetRef.current?.present();
  }, [optionsSheetRef]);

  if (isExternalAlbum(album)) {
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
      <>
        <MediaListRow
          title={album.title}
          subtitle={subtextOverride ?? album.subtext}
          subtitleTrailing={statusBadge}
          cover={album.cover}
          onPress={handlePress}
          trailing={
            <IconActionButton
              icon={<Ellipsis size={iconSize.header} color={colors.secondary} />}
              onPress={handleOptionsPress}
              accessibilityLabel={t('a11y.common.moreOptions')}
              size="compact"
            />
          }
        />

        <AlbumOptions ref={optionsSheetRef} album={album} />
      </>
    );
  }

  return (
    <View style={styles.wrapper}>
      <MediaListRow
        title={album.title}
        subtitle={subtextOverride ?? album.subtext}
        cover={album.cover}
        onPress={handlePress}
        trailing={
          <IconActionButton
            icon={<Ellipsis size={iconSize.header} color={colors.secondary} />}
            onPress={handleOptionsPress}
            accessibilityLabel={t('a11y.rows.options', { title: album.title })}
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
    paddingHorizontal: spacing.lg,
  },
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
