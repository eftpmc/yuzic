import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { getLBSimilarArtists } from '@/api/listenbrainz';
import { QueryKeys } from '@/enums/queryKeys';
import { useTheme } from '@/hooks/useTheme';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { useArtistMbid } from '@/hooks/artists';
import { selectLibraryArtists } from '@/utils/redux/selectors/librarySelectors';
import { selectListenbrainzDiscoveryEnabled } from '@/utils/redux/selectors/settingsSelectors';
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
} from '@/features/home/constants';
import MediaTile from './MediaTile';
import SkeletonTiles from '@/components/SkeletonTiles';
import { useSourceSectionPresence } from './SourceGroup';
import type { ExternalArtistBase } from '@/types';
import { spacing, typography } from '@/constants/design';

type Props = {
  /** This shelf's key in the home layout, so the source group above it knows
   * which of its sections has just gone quiet. */
  sectionKey: string;
  artistName: string;
  refreshKey?: number;
};

/**
 * "Artists similar to <one you love>" from ListenBrainz's public graph —
 * MBID-keyed, no auth required, so what turns it on is the ListenBrainz
 * discovery setting rather than a connected account. Cheap: one round-trip,
 * and the seed comes from the local library.
 *
 * Home already withholds the whole ListenBrainz group when that setting is
 * off; the check is repeated here so the shelf cannot call out from anywhere
 * else it gets mounted.
 */
export default function LBSimilarForYouSection({ sectionKey, artistName, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { navigateToArtist } = useMatchedNavigation();
  const libraryArtists = useSelector(selectLibraryArtists);
  const discoveryEnabled = useSelector(selectListenbrainzDiscoveryEnabled);

  const seed = useMemo(
    () => libraryArtists.find((a) => a.name === artistName) ?? null,
    [artistName, libraryArtists]
  );
  // Subsonic servers don't carry MusicBrainz ids, so the library mbid is null
  // for everyone not on Jellyfin/Emby and this shelf never rendered for them.
  // Looking the seed up by name is what makes it work on any server.
  // The name-to-MBID lookup is MusicBrainz's own call and carries its own
  // setting inside the hook, so on a Subsonic server with MusicBrainz off
  // there is no seed and this shelf stays away.
  const { mbid: seedMbid, isResolving } = useArtistMbid(artistName, seed?.mbid, {
    enabled: discoveryEnabled,
  });

  const gridItemWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
  );

  const query = useQuery<ExternalArtistBase[]>({
    queryKey: [QueryKeys.LbSimilarForYou, seedMbid ?? '', refreshKey],
    queryFn: async () => {
      if (!seedMbid) return [];
      const raw = await getLBSimilarArtists(seedMbid, 10);
      return raw.map((a) => ({
        id: a.artistMbid,
        name: a.name,
        cover: { kind: 'letter' as const, name: a.name },
        subtext: a.comment ?? '',
        externalIds: { mbid: a.artistMbid },
      }));
    },
    enabled: discoveryEnabled && Boolean(seedMbid),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  });

  const data = query.data ?? [];
  const isLoading =
    discoveryEnabled && (isResolving || (Boolean(seedMbid) && query.isLoading));
  const hasContent = isLoading || data.length > 0;

  useSourceSectionPresence(sectionKey, hasContent);

  const renderArtist = useCallback(({ item }: { item: ExternalArtistBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={gridItemWidth}
      radius={gridItemWidth / 2}
      onPress={() => navigateToArtist(item)}
    />
  ), [gridItemWidth, navigateToArtist]);

  // A heading over an empty rail is worse than no shelf — and the source
  // header above it goes with it, told by the presence report.
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.lbSimilarForYou', { artist: artistName, defaultValue: `Because you like ${artistName}` })}
      </Text>
      {isLoading ? (
        <SkeletonTiles
          itemSize={gridItemWidth}
          gap={SECTION_GRID_GAP}
          horizontalPadding={H_PADDING}
          variant="artist"
        />
      ) : (
        <FlashList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          overrideItemLayout={(layout) => { (layout as { size?: number }).size = gridItemWidth; }}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SECTION_GRID_GAP }} />}
          renderItem={renderArtist}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, marginBottom: spacing.md, marginLeft: H_PADDING },
});
