import React, { useRef, useState } from 'react';
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
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { SearchResult, useSearch } from '@/contexts/SearchContext';
import AlbumRow from '@/components/rows/AlbumRow';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';
import ArtistRow from '@/components/rows/ArtistRow';
import PlaylistRow from '@/components/rows/PlaylistRow';
import LoadingAlbumRow from '@/components/rows/AlbumRow/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/api';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { Song } from '@/types';

const Search = () => {
  const searchInputRef = useRef<TextInput>(null);
  const songOptionsRef = useRef<BottomSheetModal>(null);
  const playlistListRef = useRef<BottomSheetModal>(null);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const api = useApi();
  const { playSong } = usePlaying();

  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { searchResults, handleSearch, clearSearch, isLoading } = useSearch();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const song = await api.songs.get(result.id);
      if (song) {
        await playSong(song);
      }
    } catch (error) {
      console.warn('Failed to play searched song', error);
    }
  };

  const handleSongOptions = async (result: SearchResult) => {
    try {
      let song: Song | null = result.song ?? null;
      if (!song) {
        song = await api.songs.get(result.id);
      }
      if (song) {
        setSelectedSong(song);
        requestAnimationFrame(() => {
          songOptionsRef.current?.present();
        });
      }
    } catch (error) {
      console.warn('Failed to open song options', error);
    }
  };

  const getSourceLabel = (source: SearchResult['source']) =>
    source === 'external'
      ? t('search.chips.external')
      : t('search.chips.local');

  const localResults = searchResults.filter(result => result.source === 'local');
  const externalResults = searchResults.filter(result => result.source === 'external');

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
          }}
          artistName={result.subtext}
          onPress={album =>
            (navigation as any).navigate('externalAlbumView', {
              albumId: album.id
            })
          }
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
            (navigation as any).navigate('albumView', { id: album.id })
          }
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
          }}
          rounded
          onPress={() =>
            result.source === 'external'
              ? (navigation as any).navigate('externalArtistView', { mbid: result.id, name: result.title })
              : (navigation as any).navigate('artistView', { id: result.id })
          }
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
          onPress={() =>
            (navigation as any).navigate('playlistView', { id: result.id })
          }
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
      {results.map((result, index) => (
        <React.Fragment key={`${result.source}:${result.type}:${result.id}`}>
          <View style={styles.resultBlock}>{renderResult(result)}</View>
          {index < results.length - 1 && (
            <View
              style={[
                styles.separator,
                isDarkMode && styles.separatorDark,
              ]}
            />
          )}
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
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
  },
  separatorDark: {
    backgroundColor: '#333',
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
    marginBottom: 8,
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLabelFirst: {
    marginTop: 4,
  },
  sectionLabelDark: {
    color: '#9a9a9a',
  },
});
