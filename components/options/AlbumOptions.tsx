import React, { useMemo } from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLibrary } from '@/contexts/LibraryContext';

const AlbumOptions: React.FC<{ selectedAlbumId: string | null }> = ({ selectedAlbumId }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();
    const { albums } = useLibrary();

    const selectedAlbum = useMemo(() => {
        if (!selectedAlbumId) return null;
        return albums.find((album) => album.id === selectedAlbumId) || null;
    }, [selectedAlbumId, albums]);

    const handleGoToAlbum = () => {
        if (selectedAlbumId) {
            navigation.navigate('(home)', {
                screen: "collectionView",
                params: { type: "album", id: selectedAlbumId },
            });
        }
    };

    return (
        <MenuView
            title={selectedAlbum?.title || 'Album Options'}
            actions={[
                {
                    id: 'go-to-album',
                    title: 'Go to Album',
                    image: Platform.select({
                        ios: 'music.note.list',
                        android: 'ic_music_note',
                    }),
                    imageColor: "#fff",
                },
            ]}
            onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === 'go-to-album') {
                    handleGoToAlbum();
                }
            }}
        >
            <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
        </MenuView>
    );
};

export default AlbumOptions;

const styles = StyleSheet.create({
    moreButton: {
        padding: 8,
    },
});