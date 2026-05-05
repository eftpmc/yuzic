import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '@/screens/settings/components/Header';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useArtists } from '@/hooks/artists';
import { useAlbums } from '@/hooks/albums';
import { useTracks } from '@/hooks/tracks';
import {
  selectSongPlayCounts,
  selectAlbumPlayCounts,
  selectArtistPlayCounts,
} from '@/utils/redux/selectors/statsSelectors';

const TOP_N = 10;

function topEntries(counts: Record<string, number>): Array<{ id: string; count: number }> {
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

export default function StatsView() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const songCounts = useSelector(selectSongPlayCounts);
  const albumCounts = useSelector(selectAlbumPlayCounts);
  const artistCounts = useSelector(selectArtistPlayCounts);

  const { tracks } = useTracks();
  const { albums } = useAlbums();
  const { artists } = useArtists();

  const trackMap = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);
  const albumMap = useMemo(() => new Map(albums.map(a => [a.id, a])), [albums]);
  const artistMap = useMemo(() => new Map(artists.map(a => [a.id, a])), [artists]);

  const topTracks = useMemo(() => topEntries(songCounts).map(e => ({ ...e, item: trackMap.get(e.id) })).filter(e => e.item), [songCounts, trackMap]);
  const topAlbums = useMemo(() => topEntries(albumCounts).map(e => ({ ...e, item: albumMap.get(e.id) })).filter(e => e.item), [albumCounts, albumMap]);
  const topArtists = useMemo(() => topEntries(artistCounts).map(e => ({ ...e, item: artistMap.get(e.id) })).filter(e => e.item), [artistCounts, artistMap]);

  const isEmpty = topTracks.length === 0 && topAlbums.length === 0 && topArtists.length === 0;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.stats.title')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="bar-chart" size={48} color={isDarkMode ? '#555' : '#ccc'} />
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              {t('settings.stats.empty')}
            </Text>
          </View>
        ) : (
          <>
            {topArtists.length > 0 && (
              <Section title={t('settings.stats.topArtists')} isDarkMode={isDarkMode}>
                {topArtists.map(({ item, count }, index) => (
                  <React.Fragment key={item!.id}>
                    {index > 0 && <View style={[styles.divider, isDarkMode && styles.dividerDark]} />}
                    <View style={styles.row}>
                      <Text style={[styles.rank, isDarkMode && styles.rankDark]}>{index + 1}</Text>
                      <MediaImage cover={item!.cover} size="grid" style={styles.coverRound} />
                      <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]} numberOfLines={1}>
                        {item!.name}
                      </Text>
                      <Text style={[styles.badge, isDarkMode && styles.badgeDark]}>{count}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </Section>
            )}

            {topAlbums.length > 0 && (
              <Section title={t('settings.stats.topAlbums')} isDarkMode={isDarkMode}>
                {topAlbums.map(({ item, count }, index) => (
                  <React.Fragment key={item!.id}>
                    {index > 0 && <View style={[styles.divider, isDarkMode && styles.dividerDark]} />}
                    <View style={styles.row}>
                      <Text style={[styles.rank, isDarkMode && styles.rankDark]}>{index + 1}</Text>
                      <MediaImage cover={item!.cover} size="grid" style={styles.cover} />
                      <View style={styles.textBlock}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]} numberOfLines={1}>
                          {item!.title}
                        </Text>
                        <Text style={[styles.subtext, isDarkMode && styles.subtextDark]} numberOfLines={1}>
                          {item!.subtext}
                        </Text>
                      </View>
                      <Text style={[styles.badge, isDarkMode && styles.badgeDark]}>{count}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </Section>
            )}

            {topTracks.length > 0 && (
              <Section title={t('settings.stats.topSongs')} isDarkMode={isDarkMode}>
                {topTracks.map(({ item, count }, index) => (
                  <React.Fragment key={item!.id}>
                    {index > 0 && <View style={[styles.divider, isDarkMode && styles.dividerDark]} />}
                    <View style={styles.row}>
                      <Text style={[styles.rank, isDarkMode && styles.rankDark]}>{index + 1}</Text>
                      <MediaImage cover={item!.cover} size="grid" style={styles.cover} />
                      <View style={styles.textBlock}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]} numberOfLines={1}>
                          {item!.title}
                        </Text>
                        <Text style={[styles.subtext, isDarkMode && styles.subtextDark]} numberOfLines={1}>
                          {item!.artist}
                        </Text>
                      </View>
                      <Text style={[styles.badge, isDarkMode && styles.badgeDark]}>{count}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, isDarkMode, children }: { title: string; isDarkMode: boolean; children: React.ReactNode }) {
  return (
    <>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>{title}</Text>
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>{children}</View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center' },
  emptyTextDark: { color: '#555' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 4,
  },
  sectionTitleDark: { color: '#888' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  sectionDark: { backgroundColor: '#1C1C1E' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginLeft: 72,
  },
  dividerDark: { backgroundColor: '#2C2C2E' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rank: { fontSize: 13, fontWeight: '600', color: '#999', width: 18, textAlign: 'center' },
  rankDark: { color: '#666' },
  cover: { width: 44, height: 44, borderRadius: 6 },
  coverRound: { width: 44, height: 44, borderRadius: 22 },
  textBlock: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '500', color: '#000', flex: 1 },
  rowTextDark: { color: '#fff' },
  subtext: { fontSize: 13, color: '#666', marginTop: 1 },
  subtextDark: { color: '#aaa' },
  badge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    minWidth: 28,
    textAlign: 'right',
  },
  badgeDark: { color: '#666' },
});
