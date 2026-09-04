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
import { selectLibraryArtists } from '@/utils/redux/selectors/librarySelectors';
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
} from '@/features/home/constants';
import MediaTile from './MediaTile';
import SkeletonTiles from '@/components/SkeletonTiles';
import type { ExternalArtistBase } from '@/types';
import { spacing, typography } from '@/constants/design';

type Props = { artistName: string; refreshKey?: number };

/**
 * "Artists similar to <one you love>" from ListenBrainz's public graph —
 * MBID-keyed, no auth required. Cheap: one round-trip, and the seed comes
 * from the local library so the whole thing works before the user connects
 * anything.
 */
export default function LBSimilarForYouSection({ artistName, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { navigateToArtist } = useMatchedNavigation();
  const libraryArtists = useSelector(selectLibraryArtists);

  const seed = useMemo(
    () => libraryArtists.find((a) => a.name === artistName) ?? null,
    [artistName, libraryArtists]
  );
  const seedMbid = seed?.mbid ?? null;

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
        subtext: '',
        externalIds: { mbid: a.artistMbid },
      }));
    },
    enabled: Boolean(seedMbid),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  });

  const data = query.data ?? [];

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

  if (!seedMbid) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.lbSimilarForYou', { artist: artistName, defaultValue: `Because you like ${artistName}` })}
      </Text>
      {query.isLoading ? (
        <SkeletonTiles
          itemSize={gridItemWidth}
          gap={SECTION_GRID_GAP}
          horizontalPadding={H_PADDING}
          variant="artist"
        />
      ) : data.length === 0 ? null : (
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
