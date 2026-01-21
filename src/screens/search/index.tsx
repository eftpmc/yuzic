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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { SearchResult, useSearch } from '@/contexts/SearchContext';
import AlbumRow from '@/components/rows/AlbumRow';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';
import LoadingAlbumRow from '@/components/rows/AlbumRow/Loading';
import { track } from '@/utils/analytics/amplitude';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const Search = () => {
  const searchInputRef = useRef<TextInput>(null);
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const [query, setQuery] = useState('');
  const { searchResults, handleSearch, clearSearch, isLoading } = useSearch();

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  track('searching');

  const onSearchChange = (text: string) => {
    setQuery(text);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!text.trim()) {
      clearSearch();
      return;
    }

    typingTimeoutRef.current = setTimeout(async () => {
      clearSearch();
      await handleSearch(text);
    }, 300);
  };

  const renderResult = (result: SearchResult) => {
    if (result.type === 'album') {
      return result.isDownloaded ? (
        <AlbumRow
          album={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
          }}
          onPress={album =>
            navigation.navigate('albumView', { id: album.id })
          }
        />
      ) : (
        <ExternalAlbumRow
          album={{
            id: result.id,
            title: result.title,
            subtext: result.subtext,
            cover: result.cover,
          }}
          artistName={result.subtext}
          onPress={album =>
            navigation.navigate('externalAlbumView', {
              albumId: album.id
            })
          }
        />
      );
    }

    if (result.type === 'artist') {
      return (
        <TouchableOpacity
          style={styles.simpleRow}
          onPress={() =>
            navigation.navigate('artistView', { id: result.id })
          }
        >
          <Text
            style={[
              styles.simpleText,
              isDarkMode && styles.simpleTextDark,
            ]}
          >
            {result.title}
          </Text>
        </TouchableOpacity>
      );
    }

    if (result.type === 'playlist') {
      return (
        <TouchableOpacity
          style={styles.simpleRow}
          onPress={() =>
            navigation.navigate('playlistView', { id: result.id })
          }
        >
          <Text
            style={[
              styles.simpleText,
              isDarkMode && styles.simpleTextDark,
            ]}
          >
            {result.title}
          </Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

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
            placeholder="Search for music, artists, or playlists..."
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
          : searchResults.map(result => (
              <View key={`${result.type}:${result.id}`}>
                {renderResult(result)}
              </View>
            ))}

        {!isLoading && searchResults.length === 0 && (
          <Text
            style={[styles.noResults, isDarkMode && styles.noResultsDark]}
          >
            No results found
          </Text>
        )}
      </ScrollView>
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
  simpleRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  simpleText: {
    fontSize: 16,
    color: '#000',
  },
  simpleTextDark: {
    color: '#fff',
  },
});