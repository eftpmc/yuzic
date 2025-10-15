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
import CoverArt from '@/components/CoverArt';
import AlbumOptions from '@/components/options/AlbumOptions';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import { useSettings } from '@/contexts/SettingsContext';
import {Image} from "expo-image";
import {SongData} from "@/types";

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
    const artist = artists.find((artist) => artist.id === id);

    const artistSongs: SongData[] = songs.filter(
        (song) => song.artist?.toLowerCase() === artist?.name.toLowerCase()
    );

    const sortedAlbums = [...(artist?.albums || [])].sort((a, b) => {
        const playcountA = a.playcount ?? 0;
        const playcountB = b.playcount ?? 0;
        return playcountB - playcountA;
    });

    const navigateToAlbum = (album: { id: string; title: string; artist: string; isDownloaded: boolean }) => {
        if (album.isDownloaded) {
            navigation.navigate('albumView', { id: album.id });
        } else {
            navigation.navigate('externalAlbumView', { title: album.title, artist: album.artist });
        }
    };

    if (!artist) {
        return (
            <View style={styles.screenContainer(isDarkMode)}>
                <Text style={styles.errorText(isDarkMode)}>Artist not found.</Text>
            </View>
        );
    }

    return (
        <FlashList
            estimatedItemSize={80}
            ListHeaderComponent={
                <>
                    {/* Full Bleed Background */}
                    <View style={styles.fullBleedWrapper}>
                        <Image
                            source={{ uri: artist.cover }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            blurRadius={Platform.OS === 'ios' ? 20 : 10}
                            transition={300}
                            cachePolicy="disk"
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.centeredCoverContainer}>
                            <Image
                                source={{ uri: artist.cover }}
                                style={styles.centeredCover}
                                contentFit="cover"
                                transition={300}
                                cachePolicy="disk"
                            />
                        </View>
                        {/* Back Button */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Regular padded content */}
                    <View style={{ paddingHorizontal: 16 }}>
                        <View style={styles.content}>
                            <Text style={styles.artistName}>{artist.name}</Text>

                            {artist.bio && (
                                <Text style={styles.artistBio}>
                                    {artist.bio.replace(/<[^>]*>/g, '')}
                                </Text>
                            )}
                        </View>
                    </View>

                    {artistSongs.length > 0 && (
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                onPress={() => playSongInCollection(artistSongs[0], {
                                    id: artist.id,
                                    title: artist.name,
                                    artist: artist.name,
                                    cover: artist.cover,
                                    songs: artistSongs,
                                    type: 'playlist', // use consistent collection type
                                })}
                                style={styles.button}
                            >
                                <Ionicons name="play" size={18} color={themeColor} style={{ marginRight: 6 }} />
                                <Text style={styles.buttonText}>Play</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => playSongInCollection(artistSongs[0], {
                                    id: artist.id,
                                    title: artist.name,
                                    artist: artist.name,
                                    cover: artist.cover,
                                    songs: artistSongs,
                                    type: 'playlist',
                                }, true)}
                                style={styles.button}
                            >
                                <Ionicons name="shuffle" size={18} color={themeColor} style={{ marginRight: 6 }} />
                                <Text style={styles.buttonText}>Shuffle</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            }
            contentContainerStyle={{
                paddingTop: 0, // No padding at top anymore
                paddingBottom: 16, // Only bottom padding
            }}
            data={sortedAlbums}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 16 }}>
                    <View style={styles.albumItem}>
                        <TouchableOpacity style={styles.albumContent} onPress={() => navigateToAlbum(item)}>
                            <CoverArt source={item.cover} size={64} />
                            <View style={styles.albumTextContainer}>
                                <Text style={styles.albumTitle}>{item.title}</Text>
                                <Text style={styles.albumSubtext}>{item.subtext}</Text>
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
    fullBleedWrapper: {
        width: '100%',
        height: 300,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    coverArtWrapper: {
        marginTop: 8,
        width: '100%',
        height: 300,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    centeredCoverContainer: {
        position: 'absolute',
        bottom: -32, // Push down halfway
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        backgroundColor: '#222', // fallback background
    },
    centeredCover: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 16,
        zIndex: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 16,
        marginBottom: 24,
      },      
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    buttonText: {
        color: '#fff',
    },
    backButton: {
        padding: 6,
    },
    content: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    artistName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    artistBio: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        marginTop: 8,
    },
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
        color: '#fff',
    },
    albumSubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
    optionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    errorText: (isDarkMode: boolean) => ({
        color: isDarkMode ? '#fff' : '#000',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    }),
});

export default ArtistView;