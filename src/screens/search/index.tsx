import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  ScrollView,
  Text,
} from 'react-native';
import { CloudOff, Ellipsis, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchResult, useSearch } from '@/contexts/SearchContext';
import AlbumRow from '@/components/rows/AlbumRow';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';
import ArtistRow from '@/components/rows/ArtistRow';
import PlaylistRow from '@/components/rows/PlaylistRow';
import SkeletonListRow from '@/components/SkeletonListRow';
import StatusBanner from '@/components/StatusBanner';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { usePlayingActions } from '@/contexts/PlayingContext';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import { useSongActionSheets } from '@/contexts/SongActionSheetContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { prefetchCovers } from '@/utils/images/imageCache';
import { usePlayableSongResolver } from '@/hooks/songs';
import { useDeezerSearchEnabled } from '@/features/home/hooks/useDeezerEnabled';
import { useDispatch, useSelector } from 'react-redux';
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer, selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import {
  selectRecentSearchEntities,
  selectRecentSearchQueries,
} from '@/utils/redux/selectors/searchHistorySelectors';
import {
  addSearchQuery,
  addSearchEntity,
  removeSearchEntry,
  clearSearchHistory,
  type SearchEntityEntry,
} from '@/utils/redux/slices/searchHistorySlice';
import RecentSearches from './components/RecentSearches';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { getSourceMeta } from '@/features/sources/registry';
import TabHeader from '@/components/TabHeader';
import { useAccountSheet } from '@/contexts/AccountSheetContext';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

const Search = () => {
  const searchInputRef = useRef<TextInput>(null);
  const { openSongOptions } = useSongActionSheets();
  const navigation = useNavigation<any>();
  const { navigateToAlbum, navigateToArtist } = useMatchedNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { playSong } = usePlayingActions();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const deezerSearchEnabled = useDeezerSearchEnabled();
  const showSourceHeaders = useSelector(selectShowSourceHeaders);
  const username = useSelector(selectActiveServer)?.username;
  const activeServerId = useSelector(selectActiveServerId);
  const recentQueries = useSelector(selectRecentSearchQueries);
  const recentEntities = useSelector(selectRecentSearchEntities);
  const { openAccountSheet } = useAccountSheet();

  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { searchResults, handleSearchWithFilters, clearSearch, isLoading, hasError } = useSearch();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const runSearch = (text: string) => {
    clearSearch();
    setHasSearched(true);
    void handleSearchWithFilters(text, { local: true, deezer: deezerSearchEnabled });
  };

  // Only called from deliberate actions (submitting, tapping a result, replaying a
  // recent search) — never from the as-you-type debounce, or every paused keystroke
  // would get saved as its own history entry.
  const recordSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeServerId) return;
    dispatch(addSearchQuery({ serverId: activeServerId, query: trimmed }));
  };

  // Opening a result is the more useful signal than the text that led to it, so
  // the item itself is stored alongside the query and can be reopened directly.
  const recordEntity = (entity: Omit<SearchEntityEntry, 'kind'>) => {
    if (!activeServerId) return;
    dispatch(addSearchEntity({ serverId: activeServerId, entity }));
  };

  const recordResult = (result: SearchResult) => {
    recordSearch(query);
    recordEntity({
      type: result.type,
      id: result.id,
      title: result.title,
      subtitle: result.subtext,
      cover: result.cover,
      source: result.source,
      externalSource: result.externalSource,
      externalIds: result.externalIds,
    });
  };

  const onSearchChange = (text: string) => {
    setQuery(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!text.trim()) {
      clearSearch();
      setHasSearched(false);
      return;
    }
    typingTimeoutRef.current = setTimeout(() => runSearch(text), 300);
  };

  const onSearchSubmit = () => {
    Keyboard.dismiss();
    recordSearch(query);
  };

  const handleRecentPress = (value: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    Keyboard.dismiss();
    setQuery(value);
    runSearch(value);
    recordSearch(value);
  };

  const handleRemoveRecent = (key: string) => {
    if (activeServerId) dispatch(removeSearchEntry({ serverId: activeServerId, key }));
  };

  const handleRecentSongPress = async (entity: SearchEntityEntry) => {
    try {
      const song = await resolvePlayableSong(entity.id);
      if (song) await playSong(song);
      else toast.error(t('common.playbackError'));
    } catch {
      toast.error(t('common.playbackError'));
    }
  };

  // Recent entities navigate straight to the item — no round-trip through search.
  const handleRecentEntityPress = (entity: SearchEntityEntry) => {
    Keyboard.dismiss();
    recordEntity(entity);
    prefetchCovers([entity.cover], 'detail');

    if (entity.type === 'song') {
      void handleRecentSongPress(entity);
      return;
    }
    if (entity.type === 'album') {
      if (entity.source === 'external') {
        navigateToAlbum({
          id: entity.id,
          title: entity.title,
          subtext: entity.subtitle,
          cover: entity.cover,
          artist: entity.subtitle,
          externalSource: entity.externalSource,
          externalIds: entity.externalIds,
        });
      } else {
        navigation.navigate('albumView', { id: entity.id });
      }
      return;
    }
    if (entity.type === 'artist') {
      if (entity.source === 'external') {
        navigateToArtist({
          id: entity.id,
          name: entity.title,
          cover: entity.cover,
          subtext: entity.subtitle,
          externalSource: entity.externalSource,
          externalIds: entity.externalIds,
        });
      } else {
        navigation.navigate('artistView', { id: entity.id });
      }
      return;
    }
    navigation.navigate('playlistView', { id: entity.id });
  };

  const handleClearRecent = () => {
    if (activeServerId) dispatch(clearSearchHistory({ serverId: activeServerId }));
  };

  const handleSongPress = async (result: SearchResult) => {
    recordResult(result);
    try {
      if (result.song) { await playSong(result.song); return; }
      const song = await resolvePlayableSong(result.id);
      if (song) await playSong(song);
      else toast.error(t('common.playbackError'));
    } catch {
      toast.error(t('common.playbackError'));
    }
  };

  const handleSongOptions = async (result: SearchResult) => {
    try {
      const song = result.song ?? await resolvePlayableSong(result.id);
      if (song) {
        openSongOptions(song);
      } else {
        toast.error(t('common.songDetailsError'));
      }
    } catch {
      toast.error(t('common.songDetailsError'));
    }
  };

  const localResults = useMemo(() => searchResults.filter(r => r.source === 'local'), [searchResults]);

  // Group external results by their source so each gets its own labelled section
  const externalResultsBySource = useMemo(() => {
    const groups = new Map<string, typeof searchResults>();
    for (const r of searchResults) {
      if (r.source !== 'external' || !r.externalSource) continue;
      const existing = groups.get(r.externalSource);
      if (existing) existing.push(r);
      else groups.set(r.externalSource, [r]);
    }
    return groups;
  }, [searchResults]);

  const coversToPrefetch = useMemo(
    () => searchResults.slice(0, 18).map(r => r.cover),
    [searchResults]
  );
  usePrefetchCovers(coversToPrefetch, 'thumb');

  const renderResult = (result: SearchResult) => {
    if (result.type === 'song') {
      return (
        <MediaListRow
          title={result.title}
          subtitle={result.subtext}
          cover={result.cover}
          onPress={() => { void handleSongPress(result); }}
          trailing={
            <IconActionButton
              icon={<Ellipsis size={24} color={colors.secondary} />}
              onPress={() => { void handleSongOptions(result); }}
              accessibilityLabel={`Search result song ${result.title} options`}
              size="compact"
            />
          }
        />
      );
    }

    if (result.type === 'album') {
      return result.source === 'external' ? (
        <ExternalAlbumRow
          album={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
            artist: result.subtext,
            externalSource: result.externalSource,
            externalIds: result.externalIds,
          }}
          onPress={album => {
            recordResult(result);
            prefetchCovers([album.cover], 'detail');
            navigateToAlbum(album);
          }}
        />
      ) : (
        <AlbumRow
          album={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
            artist: { id: '', name: result.subtext, subtext: '', cover: { kind: 'none' } },
            year: 0,
            genres: [],
            created: new Date(0),
          }}
          onPress={album => {
            recordResult(result);
            prefetchCovers([album.cover], 'detail');
            navigation.navigate('albumView', { id: album.id });
          }}
        />
      );
    }

    if (result.type === 'artist') {
      return (
        <ArtistRow
          artist={{ id: result.id, name: result.title, subtext: result.subtext, cover: result.cover, albumIds: [] }}
          rounded
          onPress={() => {
            recordResult(result);
            prefetchCovers([result.cover], 'detail');
            if (result.source === 'external') {
              navigateToArtist({ id: result.id, name: result.title, cover: result.cover, subtext: result.subtext, externalSource: result.externalSource, externalIds: result.externalIds });
            } else {
              navigation.navigate('artistView', { id: result.id });
            }
          }}
        />
      );
    }

    if (result.type === 'playlist') {
      return (
        <PlaylistRow
          playlist={{ id: result.id, title: result.title, subtext: result.subtext, cover: result.cover, changed: new Date(), created: new Date() }}
          onPress={() => {
            recordResult(result);
            prefetchCovers([result.cover], 'detail');
            navigation.navigate('playlistView', { id: result.id });
          }}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView testID="search-screen" edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <TabHeader
        title={t('search.title')}
        username={username}
        onAccountPress={openAccountSheet}
      />
      <View style={styles.headerRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.muted }]}>
          <TextInput
            accessibilityLabel="Search input"
            testID="search-input"
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.secondary }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={onSearchChange}
            returnKeyType="search"
            onSubmitEditing={onSearchSubmit}
          />
          {query !== '' && (
            <Touchable
              style={styles.clearButton}
              onPress={() => { setQuery(''); clearSearch(); setHasSearched(false); }}
            >
              <X size={20} color={colors.secondary} />
            </Touchable>
          )}
        </View>
      </View>

      {hasSearched && !isLoading && hasError && (
        <StatusBanner
          icon={<CloudOff size={14} color={colors.subtext} />}
          text={t('search.searchError')}
          closable
          style={styles.errorBanner}
          testID="search-error-banner"
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {query.trim() === ''
          ? (
            <RecentSearches
              queries={recentQueries}
              entities={recentEntities}
              onQueryPress={handleRecentPress}
              onEntityPress={handleRecentEntityPress}
              onRemove={handleRemoveRecent}
              onClear={handleClearRecent}
            />
          )
          : isLoading
            ? [...Array(8)].map((_, i) => <SkeletonListRow key={i} />)
            : (
              <>
                {localResults.map(result => (
                  <View key={`local:${result.type}:${result.id}`} style={styles.resultBlock}>
                    {renderResult(result)}
                  </View>
                ))}

                {Array.from(externalResultsBySource.entries()).map(([sourceId, results]) => {
                  const meta = getSourceMeta(sourceId);
                  const label = meta?.label ?? sourceId;
                  const color = meta?.color ?? colors.subtext;
                  const letter = label.charAt(0).toUpperCase();
                  return (
                    <React.Fragment key={sourceId}>
                      <View style={styles.sourceHeader}>
                        {showSourceHeaders && (
                          <View style={[styles.sourceBadge, { backgroundColor: color }]}>
                            <Text style={styles.sourceBadgeLetter}>{letter}</Text>
                          </View>
                        )}
                        <Text style={[styles.sourceHeaderText, { color: colors.subtext }]}>{label}</Text>
                      </View>
                      {results.map((result, i) => (
                        <View key={`external:${result.type}:${result.id}`} style={[styles.resultBlock, i === 0 && styles.resultBlockFirst]}>
                          {renderResult(result)}
                        </View>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )
        }

        {query.trim() !== '' && hasSearched && !isLoading && searchResults.length === 0 && (
          <Text testID="search-no-results" style={[styles.noResults, { color: colors.subtext }]}>
            {t('search.noResults')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.scrollClearance,
  },
  resultBlock: {},
  resultBlockFirst: {
    paddingTop: spacing.sm,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.roomy,
    paddingBottom: spacing.xs,
  },
  sourceBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    ...typography.micro,
    fontWeight: '500',
    color: '#fff',
  },
  sourceHeaderText: {
    ...typography.rowSubtitle,
    fontWeight: '500',
  },
  noResults: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
