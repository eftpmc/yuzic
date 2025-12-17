import React, { useRef, useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Keyboard,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    Text,
    Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { sharedStyles } from "@/styles/sharedStyles";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSearch } from '@/contexts/SearchContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSettings } from "@/contexts/SettingsContext";

import SongOptions from "@/components/options/SongOptions";
import ExternalAlbumOptions from "@/components/options/ExternalAlbumOptions";
import AlbumOptions from "@/components/options/AlbumOptions";
import CoverArt from '@/components/CoverArt';

const SearchPage = () => {
    const searchInputRef = useRef(null);
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const { themeColor } = useSettings();
    const { songs } = useLibrary();
    const { playSong } = usePlaying();

    const [query, setQuery] = useState('');
    const { searchResults, handleSearch, clearSearch, isLoading } = useSearch();

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            setTimeout(() => searchInputRef.current?.focus(), 350);
        }, [])
    );

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

    const navigateToResult = (result) => {
        const { id, type } = result;
        switch (type) {
            case 'album':
                navigation.navigate('albumView', { id });
                break;
            case 'playlist':
                navigation.navigate('playlistView', { id });
                break;
            case 'artist':
                navigation.navigate('artistView', { id });
                break;
            default:
                console.warn(`Unknown search type: ${type}`);
        }
    };

    const handleSongPlay = (result) => {
        const full = songs.find((s) => s.id === result.id);
        if (!full) return console.warn('Song not found in library.');

        playSong(full);
    };

    const SkeletonItem = () => (
        <View style={[styles.resultItem]}>
            <View style={[styles.skeletonImage, isDarkMode && styles.skeletonImageDark]} />
            <View style={styles.resultTextContainer}>
                <View style={[styles.skeletonTitle, isDarkMode && styles.skeletonTitleDark]} />
                <View style={[styles.skeletonSubtext, isDarkMode && styles.skeletonSubtextDark]} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            {/* SEARCH BAR ROW */}
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

                <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
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

            {/* RESULTS */}
            <ScrollView contentContainerStyle={sharedStyles.scrollContent}>
                {isLoading
                    ? [...Array(8)].map((_, i) => <SkeletonItem key={i} />)
                    : searchResults.map((result) => (
                        <View key={result.id} style={styles.resultItem}>
                            <TouchableOpacity
                                style={styles.resultContent}
                                onPress={() => {
                                    if (result.type === 'song') handleSongPlay(result);
                                    else navigateToResult(result);
                                }}
                            >
                                <CoverArt source={result.cover} size={50} />

                                <View style={styles.resultTextContainer}>
                                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.resultTitle, isDarkMode && styles.resultTitleDark]}>
                                        {result.title}
                                    </Text>
                                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.resultSubtext, isDarkMode && styles.resultSubtextDark]}>
                                        {result.subtext}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.optionsContainer}>
                                {/* DOWNLOAD STATUS */}
                                {result.isDownloaded && (
                                    <MaterialIcons
                                        name="check-circle"
                                        size={20}
                                        color={themeColor}
                                        style={{ marginRight: 8 }}
                                    />
                                )}

                                {/* OPTIONS */}
                                {result.type === 'song' ? (
                                    <SongOptions selectedSong={result} />
                                ) : result.type === 'album' ? (
                                    result.isDownloaded ? (
                                        <AlbumOptions selectedAlbumId={result.id} />
                                    ) : (
                                        <ExternalAlbumOptions
                                            selectedAlbumTitle={result.title}
                                            selectedAlbumArtist={result.subtext}
                                        />
                                    )
                                ) : null}
                            </View>
                        </View>
                    ))}

                {!isLoading && searchResults.length === 0 && (
                    <Text style={[styles.noResults, isDarkMode && styles.noResultsDark]}>
                        No results found
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SearchPage;

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
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

    /* RESULTS LIST -------------------------------------------------------- */
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    resultContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    resultTextContainer: {
        flex: 1,
    },

    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
    },
    resultTitleDark: {
        color: '#fff',
    },

    resultSubtext: {
        fontSize: 14,
        color: '#777',
    },
    resultSubtextDark: {
        color: '#aaa',
    },

    optionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },

    /* NO RESULTS ---------------------------------------------------------- */
    noResults: {
        textAlign: 'center',
        marginTop: 24,
        color: '#777',
        fontSize: 16,
    },
    noResultsDark: {
        color: '#aaa',
    },

    /* SKELETON LOADING ---------------------------------------------------- */
    skeletonImage: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 16,
        backgroundColor: '#ccc',
    },
    skeletonImageDark: {
        backgroundColor: '#444',
    },

    skeletonTitle: {
        width: '60%',
        height: 16,
        borderRadius: 4,
        backgroundColor: '#ddd',
        marginBottom: 6,
    },
    skeletonTitleDark: {
        backgroundColor: '#444',
    },

    skeletonSubtext: {
        width: '40%',
        height: 14,
        borderRadius: 4,
        backgroundColor: '#ddd',
    },
    skeletonSubtextDark: {
        backgroundColor: '#444',
    },
});