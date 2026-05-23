import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Ellipsis, ChevronLeft, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchResult, useSearch } from '@/contexts/SearchContext';
import AlbumRow from '@/components/rows/AlbumRow';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';
import ArtistRow from '@/components/rows/ArtistRow';
import PlaylistRow from '@/components/rows/PlaylistRow';
import LoadingAlbumRow from '@/components/rows/AlbumRow/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { Song } from '@/types';
import { toast } from '@backpackapp-io/react-native-toast';
import { useSheetRef } from '@/utils/useSheetRef';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { prefetchCovers } from '@/utils/images/imageCache';
import { usePlayableSongResolver } from '@/hooks/songs';
import { useDeezerSearchEnabled } from '@/features/home/hooks/useDeezerEnabled';
import { useSelector } from 'react-redux';
import { selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { getSourceMeta } from '@/features/sources/registry';

const Search = () => {
  const searchInputRef = useRef<TextInput>(null);
  const songOptionsRef = useSheetRef();
  const playlistListRef = useSheetRef();
  const navigation = useNavigation<any>();
  const { navigateToAlbum, navigateToArtist } = useMatchedNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSong } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const deezerSearchEnabled = useDeezerSearchEnabled();
  const showSourceHeaders = useSelector(selectShowSourceHeaders);

  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { searchResults, handleSearchWithFilters, clearSearch, isLoading } = useSearch();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const onSearchChange = (text: string) => {
    setQuery(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!text.trim()) {
      clearSearch();
      setHasSearched(false);
      return;
    }
    typingTimeoutRef.current = setTimeout(async () => {
      clearSearch();
      setHasSearched(true);
      await handleSearchWithFilters(text, { local: true, deezer: deezerSearchEnabled });
    }, 300);
  };

  const handleSongPress = async (result: SearchResult) => {
    try {
      if (result.song) { await playSong(result.song); return; }
      const song = await resolvePlayableSong(result.id);
      if (song) await playSong(song);
    } catch {
      toast.error(t('common.playbackError'));
    }
  };

  const handleSongOptions = async (result: SearchResult) => {
    try {
      let song: Song | null = result.song ?? null;
      if (!song) song = await resolvePlayableSong(result.id);
      if (song) {
        setSelectedSong(song);
        requestAnimationFrame(() => { songOptionsRef.current?.present(); });
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
        <View style={styles.songWrapper}>
          <View style={styles.songRow}>
            <TouchableOpacity
              accessibilityLabel={`Search result song ${result.title}`}
              accessibilityRole="button"
              testID="search-song-result"
              style={styles.songInfo}
              onPress={() => { void handleSongPress(result); }}
            >
              <MediaImage cover={result.cover} size="thumb" style={styles.songCover} />
              <View style={styles.songText}>
                <Text numberOfLines={1} style={[styles.songTitle, { color: colors.secondary }]}>
                  {result.title}
                </Text>
                <Text numberOfLines={1} style={[styles.songSubtitle, { color: colors.subtext }]}>
                  {result.subtext}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.songOptionsButton} onPress={() => { void handleSongOptions(result); }}>
              <Ellipsis size={24} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>
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
          artistName={result.subtext}
          onPress={album => {
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
            prefetchCovers([result.cover], 'detail');
            navigation.navigate('playlistView', { id: result.id });
          }}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView testID="search-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>

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
            onSubmitEditing={Keyboard.dismiss}
          />
          {query !== '' && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => { setQuery(''); clearSearch(); setHasSearched(false); }}
            >
              <X size={20} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading
          ? [...Array(8)].map((_, i) => <LoadingAlbumRow key={i} />)
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

        {hasSearched && !isLoading && searchResults.length === 0 && (
          <Text testID="search-no-results" style={[styles.noResults, { color: colors.subtext }]}>
            {t('search.noResults')}
          </Text>
        )}
      </ScrollView>

      {selectedSong && (
        <SongOptions
          ref={songOptionsRef}
          selectedSong={selectedSong}
          onAddToPlaylist={() => playlistListRef.current?.present()}
        />
      )}
      <PlaylistList
        ref={playlistListRef}
        selectedSong={selectedSong}
        onClose={() => playlistListRef.current?.dismiss()}
      />
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 80 : 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 8,
  },
  resultBlock: {},
  resultBlockFirst: {
    paddingTop: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sourceBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeLetter: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  sourceHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  songWrapper: {
    paddingHorizontal: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  songCover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  songText: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  songSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  songOptionsButton: {
    padding: 8,
  },
});
