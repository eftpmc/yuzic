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
import {useSettings} from "@/contexts/SettingsContext";
import SongOptions from "@/components/options/SongOptions";
import ExternalAlbumOptions from "@/components/options/ExternalAlbumOptions";
import CoverArt from '@/components/CoverArt';
import AlbumOptions from "@/components/options/AlbumOptions";

const SearchPage = () => {
    const searchInputRef = useRef(null);
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const { playSong } = usePlaying();
    const { themeColor } = useSettings();
    const { songs } = useLibrary();
    const isDarkMode = colorScheme === 'dark';
    const [query, setQuery] = useState('');
    const { searchResults, handleSearch, clearSearch, isLoading } = useSearch();

    useFocusEffect(
        React.useCallback(() => {
            if (searchInputRef.current) {
                setTimeout(() => {
                    searchInputRef.current.focus();
                }, 350);
            }
        }, [])
    );

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                console.warn('Unknown result type:', type);
                break;
        }
    };

    const handleSongPlay = (songResult) => {
        const fullSong = songs.find((s) => s.id === songResult.id);

        if (!fullSong) {
            console.warn('Song not found in library.');
            return;
        }

        playSong({
            id: fullSong.id,
            title: fullSong.title,
            artist: fullSong.artist,
            cover: fullSong.cover,
            streamUrl: fullSong.streamUrl,
            duration: fullSong.duration,
            globalPlayCount: fullSong.globalPlayCount,
        });
    };

    const SkeletonItem = () => (
        <View style={[styles.resultItem, { opacity: 0.5 }]}>
            <View style={styles.skeletonImage} />
            <View style={styles.resultTextContainer}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtext} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.row, { justifyContent: 'flex-start', alignItems: 'center' }]}>
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
                <View style={styles.searchContainer}>
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { flex: 1 }]}
                        placeholder="Search for music, artists, or playlists..."
                        placeholderTextColor={isDarkMode ? '#888' : '#444'}
                        value={query}
                        onChangeText={onSearchChange}
                        returnKeyType="search"
                        onSubmitEditing={Keyboard.dismiss}
                    />
                    {query ? (
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
                                color={isDarkMode ? '#fff' : '#333'}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <ScrollView contentContainerStyle={sharedStyles.scrollContent}>
                {isLoading ? (
                    [...Array(8)].map((_, index) => <SkeletonItem key={index} />)
                ) : (
                    searchResults.map((result) => (
                        <View key={result.id} style={styles.resultItem}>
                            <TouchableOpacity
                                style={styles.resultContent}
                                onPress={() => {
                                    if (result.type === 'song') {
                                        handleSongPlay(result);
                                    } else {
                                        navigateToResult(result);
                                    }
                                }}
                            >
                                <CoverArt source={result.cover} size={50} />
                                <View style={styles.resultTextContainer}>
                                    <Text style={styles.resultTitle}>{result.title}</Text>
                                    <Text style={styles.resultSubtext}>{result.subtext}</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.optionsContainer}>
                                {result.isDownloaded && (
                                    <MaterialIcons
                                        name="check-circle"
                                        size={20}
                                        color={themeColor}
                                        style={{ marginRight: 8 }}
                                    />
                                )}

                                {result.type === 'song' ? (
                                    <SongOptions selectedSongId={result.id} />
                                ) : result.type === 'album' ? (
                                    result.isDownloaded ? (
                                        <AlbumOptions selectedAlbumId={result.id} />
                                    ) : (
                                        <ExternalAlbumOptions selectedAlbumTitle={result.title} selectedAlbumArtist={result.subtext}/>
                                    )
                                ) : null}
                            </View>
                        </View>
                    ))
                )}

                {!isLoading && searchResults.length === 0 && (
                    <Text style={styles.noResults}>No results found</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SearchPage;


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
        backgroundColor: '#222',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 8,
    },
    clearButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    optionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    resultTextContainer: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    resultSubtext: {
        fontSize: 14,
        color: '#888',
    },
    noResults: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 16,
    },
    skeletonImage: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 16,
        backgroundColor: '#444',
    },
    skeletonTitle: {
        width: '60%',
        height: 16,
        borderRadius: 4,
        backgroundColor: '#444',
        marginBottom: 6,
    },
    skeletonSubtext: {
        width: '40%',
        height: 14,
        borderRadius: 4,
        backgroundColor: '#444',
    },
});