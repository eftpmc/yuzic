import React from 'react';
import { MenuView } from '@react-native-menu/menu';
import { TouchableOpacity, StyleSheet, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLidarr } from '@/contexts/LidarrContext';

interface ExternalAlbumOptionsProps {
    selectedAlbumTitle: string;
    selectedAlbumArtist: string;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({ selectedAlbumTitle, selectedAlbumArtist }) => {
    const colorScheme = useColorScheme();
    const { downloadAlbum } = useLidarr();
    const isDarkMode = colorScheme === 'dark';

    const handleDownloadAlbum = async () => {
        if (!selectedAlbumTitle || !selectedAlbumArtist) return;

        console.log(`Starting download: Album="${selectedAlbumTitle}", Artist="${selectedAlbumArtist}"`);

        const result = await downloadAlbum(selectedAlbumTitle, selectedAlbumArtist);

        if (result.success) {
            console.log('Album added successfully to Lidarr!');
        } else {
            console.warn('Download failed:', result.message);
        }
    };

    return (
        <MenuView
            title="External Album"
            actions={[
                {
                    id: 'download-album',
                    title: 'Download Album',
                    image: Platform.select({
                        ios: 'arrow.down.circle',
                        android: 'ic_download',
                    }),
                    imageColor: '#fff',
                },
            ]}
            onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === 'download-album') {
                    handleDownloadAlbum();
                }
            }}
        >
            <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
        </MenuView>
    );
};

export default ExternalAlbumOptions;

const styles = StyleSheet.create({
    moreButton: {
        padding: 8,
    },
});