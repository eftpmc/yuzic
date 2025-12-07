import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';
import CoverArt from '@/components/CoverArt';
import AlbumOptions from '@/components/options/AlbumOptions';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import { Image } from "expo-image";
import { SongData } from "@/types";

type ArtistViewRouteParams = {
    id: string;
};

const ArtistView: React.FC = () => {
    const route = useRoute<RouteProp<{ params: ArtistViewRouteParams }, 'params'>>();
    const navigation = useNavigation();
    const { themeColor } = useSettings();
    const { artists, songs } = useLibrary();
    const { playSongInCollection } = usePlaying();

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const { id } = route.params;
    const artist = artists.find((a) => a.id === id);

    const artistSongs: SongData[] = songs.filter(
        (song) => song.artist?.toLowerCase() === artist?.name.toLowerCase()
    );

    const sortedAlbums = [...(artist?.albums || [])].sort((a, b) => (b.playcount ?? 0) - (a.playcount ?? 0));

    const navigateToAlbum = (album: any) => {
        if (album.isDownloaded) {
            navigation.navigate('collectionView', { type: "album", collection: album });
        } else {
            navigation.navigate('externalAlbumView', {
                title: album.title,
                artist: album.artist
            });
        }
    };

    if (!artist) {
        return (
            <View style={[styles.container, isDarkMode && styles.containerDark]}>
                <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
                    Artist not found.
                </Text>
            </View>
        );
    }

    return (
        <FlashList
            estimatedItemSize={80}
            ListHeaderComponent={
                <>
                    {/* HEADER IMAGE BACKGROUND */}
                    <View style={styles.fullBleedWrapper}>
                        <Image
                            source={{ uri: artist.cover }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            blurRadius={Platform.OS === 'ios' ? 20 : 10}
                            transition={300}
                        />

                        <LinearGradient
                            colors={
                                isDarkMode
                                    ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']
                                    : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']
                            }
                            style={StyleSheet.absoluteFill}
                        />

                        {/* CENTER CIRCLE COVER */}
                        <View style={styles.centeredCoverContainer}>
                            <Image
                                source={{ uri: artist.cover }}
                                style={styles.centeredCover}
                                contentFit="cover"
                            />
                        </View>

                        {/* BACK BUTTON */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Ionicons
                                    name="arrow-back"
                                    size={24}
                                    color={isDarkMode ? '#fff' : '#000'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ARTIST INFORMATION */}
                    <View style={{ paddingHorizontal: 16 }}>
                        <View style={styles.content}>
                            <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
                                {artist.name}
                            </Text>

                            {artist.bio && (
                                <Text style={[styles.artistBio, isDarkMode && styles.artistBioDark]}>
                                    {artist.bio.replace(/<[^>]*>/g, '')}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* PLAY + SHUFFLE */}
                    {artistSongs.length > 0 && (
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                onPress={() =>
                                    playSongInCollection(artistSongs[0], {
                                        id: artist.id,
                                        title: artist.name,
                                        artist: artist.name,
                                        cover: artist.cover,
                                        songs: artistSongs,
                                        type: 'playlist',
                                    })
                                }
                                style={[styles.button, isDarkMode && styles.buttonDark]}
                            >
                                <Ionicons name="play" size={18} color={themeColor} style={{ marginRight: 6 }} />
                                <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
                                    Play
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() =>
                                    playSongInCollection(
                                        artistSongs[0],
                                        {
                                            id: artist.id,
                                            title: artist.name,
                                            artist: artist.name,
                                            cover: artist.cover,
                                            songs: artistSongs,
                                            type: 'playlist',
                                        },
                                        true
                                    )
                                }
                                style={[styles.button, isDarkMode && styles.buttonDark]}
                            >
                                <Ionicons name="shuffle" size={18} color={themeColor} style={{ marginRight: 6 }} />
                                <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
                                    Shuffle
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            }
            contentContainerStyle={{
                paddingBottom: 24,
                backgroundColor: isDarkMode ? '#000' : '#fff',
            }}
            data={sortedAlbums}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 16 }}>
                    <View style={styles.albumItem}>
                        <TouchableOpacity style={styles.albumContent} onPress={() => navigateToAlbum(item)}>
                            <CoverArt source={item.cover} size={64} />
                            <View style={styles.albumTextContainer}>
                                <Text style={[styles.albumTitle, isDarkMode && styles.albumTitleDark]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.albumSubtext, isDarkMode && styles.albumSubtextDark]}>
                                    {item.subtext}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.optionsContainer}>
                            {item.isDownloaded && (
                                <MaterialIcons
                                    name="check-circle"
                                    size={20}
                                    color={themeColor}
                                    style={{ marginRight: 8 }}
                                />
                            )}

                            {item.isDownloaded ? (
                                <AlbumOptions selectedAlbumId={item.id} />
                            ) : (
                                <ExternalAlbumOptions selectedAlbumTitle={item.title} selectedAlbumArtist={item.artist} />
                            )}
                        </View>
                    </View>
                </View>
            )}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#000',
    },

    errorText: {
        color: '#000',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    errorTextDark: {
        color: '#fff',
    },

    fullBleedWrapper: {
        width: '100%',
        height: 300,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },

    centeredCoverContainer: {
        position: 'absolute',
        bottom: -32,
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredCover: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },

    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 16,
        zIndex: 20,
    },
    backButton: {
        padding: 6,
    },

    content: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
    },

    artistName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
    artistNameDark: {
        color: '#fff',
    },

    artistBio: {
        fontSize: 14,
        color: '#444',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
    artistBioDark: {
        color: '#ccc',
    },

    /* PLAY / SHUFFLE */
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    buttonDark: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    buttonText: {
        fontWeight: '600',
        color: '#000',
    },
    buttonTextDark: {
        color: '#fff',
    },

    /* ALBUM LIST */
    albumItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    albumContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    albumTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    albumTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    albumTitleDark: {
        color: '#fff',
    },
    albumSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    albumSubtextDark: {
        color: '#aaa',
    },

    optionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default ArtistView;