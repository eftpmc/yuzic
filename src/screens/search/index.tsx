import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
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

const Search = () => {
  const searchInputRef = useRef<TextInput>(null);
  const songOptionsRef = useSheetRef();
  const playlistListRef = useSheetRef();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { playSong } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();

  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { searchResults, handleSearch, clearSearch, isLoading } = useSearch();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const onSearchChange = (text: string) => {
    setQuery(text);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!text.trim()) {
      clearSearch();
      setHasSearched(false);
      return;
    }

    typingTimeoutRef.current = setTimeout(async () => {
      clearSearch();
      setHasSearched(true);
      await handleSearch(text);
    }, 300);
  };

  const handleSongPress = async (result: SearchResult) => {
    try {
      if (result.song) {
        await playSong(result.song);
        return;
      }
      const song = await resolvePlayableSong(result.id);
      if (song) {
        await playSong(song);
      }
    } catch (error) {
      console.warn('Failed to play searched song', error);
      toast.error(t('common.playbackError'));
    }
  };

  const handleSongOptions = async (result: SearchResult) => {
    try {
      let song: Song | null = result.song ?? null;
      if (!song) {
        song = await resolvePlayableSong(result.id);
      }
      if (song) {
        setSelectedSong(song);
        requestAnimationFrame(() => {
          songOptionsRef.current?.present();
        });
      }
    } catch (error) {
      console.warn('Failed to open song options', error);
      toast.error(t('common.songDetailsError'));
    }
  };

  const getSourceLabel = (source: SearchResult['source']) =>
    source === 'external'
      ? t('search.chips.external')
      : t('search.chips.local');

  const localResults = searchResults.filter(result => result.source === 'local');
  const externalResults = searchResults.filter(result => result.source === 'external');
  const coversToPrefetch = useMemo(() => searchResults.slice(0, 18).map(result => result.cover), [searchResults]);
  usePrefetchCovers(coversToPrefetch, 'thumb');

  const renderResult = (result: SearchResult) => {
    if (result.type === 'song') {
      return (
        <View style={styles.songWrapper}>
          <View style={styles.songRow}>
            <TouchableOpacity
              style={styles.songInfo}
              onPress={() => handleSongPress(result)}
            >
              <MediaImage
                cover={result.cover}
                size="thumb"
                style={styles.songCover}
              />
              <View style={styles.songText}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.songTitle,
                    isDarkMode && styles.songTitleDark,
                  ]}
                >
                  {result.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.songSubtitle,
                    isDarkMode && styles.songSubtitleDark,
                  ]}
                >
                  {result.subtext}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.songOptionsButton}
              onPress={() => handleSongOptions(result)}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={isDarkMode ? '#fff' : '#000'}
              />
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
          onPress={album =>
          {
            prefetchCovers([album.cover], 'detail');
            (navigation as any).navigate('externalAlbumView', {
              source: album.externalSource,
              albumId: album.id
            });
          }}
        />
      ) : (
        <AlbumRow
          album={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
            artist: {
              id: '',
              name: result.subtext,
              subtext: '',
              cover: { kind: 'none' },
            },
            year: 0,
            genres: [],
            created: new Date(0),
          }}
          onPress={album =>
          {
            prefetchCovers([album.cover], 'detail');
            (navigation as any).navigate('albumView', { id: album.id });
          }}
        />
      );
    }

    if (result.type === 'artist') {
      return (
        <ArtistRow
          artist={{
            id: result.id,
            name: result.title,
            subtext: result.subtext,
            cover: result.cover,
            albumIds: [],
          }}
          rounded
          onPress={() => {
            prefetchCovers([result.cover], 'detail');
            if (result.source === 'external') {
              (navigation as any).navigate('externalArtistView', {
                source: result.externalSource,
                artistId: result.externalIds?.deezerId,
                mbid: result.externalIds?.mbid ?? result.id,
                name: result.title,
              });
            } else {
              (navigation as any).navigate('artistView', { id: result.id });
            }
          }}
        />
      );
    }

    if (result.type === 'playlist') {
      return (
        <PlaylistRow
          playlist={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
            changed: new Date(),
            created: new Date(),
          }}
          onPress={() => {
            prefetchCovers([result.cover], 'detail');
            (navigation as any).navigate('playlistView', { id: result.id });
          }}
        />
      );
    }

    return null;
  };

  const renderSourceSection = (
    results: SearchResult[],
    source: SearchResult['source'],
    isFirstSection: boolean
  ) => (
    <React.Fragment>
      <Text
        style={[
          styles.sectionLabel,
          isFirstSection && styles.sectionLabelFirst,
          isDarkMode && styles.sectionLabelDark,
        ]}
      >
        {getSourceLabel(source)}
      </Text>
      {results.map((result) => (
        <React.Fragment key={`${result.source}:${result.type}:${result.id}`}>
          <View style={styles.resultBlock}>{renderResult(result)}</View>
        </React.Fragment>
      ))}
    </React.Fragment>
  );

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.searchContainer,
            isDarkMode && styles.searchContainerDark,
          ]}
        >
          <TextInput
            ref={searchInputRef}
            style={[
              styles.searchInput,
              isDarkMode && styles.searchInputDark,
            ]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
            value={query}
            onChangeText={onSearchChange}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />

          {query !== '' && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setQuery('');
                clearSearch();
                setHasSearched(false);
              }}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={isDarkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading
          ? [...Array(8)].map((_, i) => <LoadingAlbumRow key={i} />)
          : (
            <>
              {localResults.length > 0 &&
                renderSourceSection(localResults, 'local', true)}
              {externalResults.length > 0 &&
                renderSourceSection(externalResults, 'external', localResults.length === 0)}
            </>
          )}

        {hasSearched && !isLoading && searchResults.length === 0 && (
          <Text
            style={[styles.noResults, isDarkMode && styles.noResultsDark]}
          >
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
  scrollContent: {
    paddingVertical: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: Platform.OS === 'ios' ? 80 : 16,
  },
  containerDark: {
    backgroundColor: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchContainerDark: {
    backgroundColor: '#222',
  },
  searchInput: {
    flex: 1,
    color: '#000',
    fontSize: 16,
    paddingVertical: 8,
  },
  searchInputDark: {
    color: '#fff',
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 24,
    color: '#777',
    fontSize: 16,
  },
  noResultsDark: {
    color: '#aaa',
  },
  resultBlock: {
    paddingBottom: 0,
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
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  songTitleDark: {
    color: '#fff',
  },
  songSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  songSubtitleDark: {
    color: '#aaa',
  },
  songOptionsButton: {
    padding: 8,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 18,
    fontSize: 18,
    color: '#111',
    fontWeight: '700',
  },
  sectionLabelFirst: {
    marginTop: 8,
  },
  sectionLabelDark: {
    color: '#fff',
  },
});
