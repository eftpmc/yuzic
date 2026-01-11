import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Appearance,
} from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useDownload } from '@/contexts/DownloadContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { useSelector } from 'react-redux';
import { selectFavoritesPlaylist } from '@/utils/redux/selectors/selectFavoritesPlaylist';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { FAVORITES_ID } from '@/constants/favorites';

interface ItemProps {
    id: string;
    title: string;
    subtext: string;
    cover: CoverSource;
    isGridView: boolean;
    gridWidth: number;
}

const PlaylistItem: React.FC<ItemProps> = ({
    id,
    title,
    subtext,
    cover,
    isGridView,
    gridWidth,
}) => {
    const {
        downloadPlaylistById,
        isPlaylistDownloaded,
        isDownloadingPlaylist,
    } = useDownload();

    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const api = useApi();
    const { playSongInCollection } = usePlaying();

    const favorites = useSelector(selectFavoritesPlaylist);
    const [isLoading, setIsLoading] = useState(false);

    const isDownloaded = isPlaylistDownloaded(id);
    const isDownloading = isDownloadingPlaylist(id);

    const handlePlay = useCallback(
        async (shuffle: boolean) => {
            let playlist;

            if (id === FAVORITES_ID) {
                playlist = favorites;
            } else {
                playlist = await queryClient.fetchQuery({
                    queryKey: [QueryKeys.Playlist, id],
                    queryFn: () => api.playlists.get(id),
                    staleTime: 2 * 60 * 1000,
                });
            }

            if (!playlist || playlist.songs.length === 0) return;

            playSongInCollection(playlist.songs[0], playlist, shuffle);
        },
        [id, favorites]
    );

    const handleDownload = async () => {
        if (isDownloaded || isDownloading || isLoading) return;
        setIsLoading(true);
        try {
            await downloadPlaylistById(id);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigation = () => {
        navigation.navigate('playlistView', { id });
    };

    const image = isGridView ? (
        <MediaImage
            cover={cover}
            size="grid"
            style={{
                width: gridWidth,
                aspectRatio: 1,
                borderRadius: 8,
            }}
        />
    ) : (
        <MediaImage
            cover={cover}
            size="thumb"
            style={{
                width: 50,
                height: 50,
                borderRadius: 4,
                marginRight: 12,
            }}
        />
    );

    const actions = [
        {
            id: 'play',
            title: 'Play',
            image: 'play.fill',
        },
        {
            id: 'shuffle',
            title: 'Shuffle',
            image: 'shuffle',
        },
        {
            id: 'go-to',
            title: 'Go to Playlist',
            image: 'music.note.list',
        },
        {
            id: 'download',
            title: isDownloading
                ? 'Downloading…'
                : isDownloaded
                    ? 'Downloaded'
                    : 'Download',
            image: isDownloading
                ? 'hourglass'
                : isDownloaded
                    ? 'checkmark.circle'
                    : 'arrow.down.circle',
            attributes: {
                disabled: isDownloaded || isDownloading,
            },
        },
    ];

    const onPressAction = ({ nativeEvent }: any) => {
        switch (nativeEvent.event) {
            case 'play':
                handlePlay(false);
                break;
            case 'shuffle':
                handlePlay(true);
                break;
            case 'go-to':
                handleNavigation();
                break;
            case 'download':
                handleDownload();
                break;
        }
    };

    return (
        <MenuView
            title={title || 'Options'}
            actions={actions}
            onPressAction={onPressAction}
            shouldOpenOnLongPress
        >
            <TouchableOpacity
                onPress={handleNavigation}
                style={
                    isGridView
                        ? [styles.gridItemContainer, { width: gridWidth }]
                        : styles.itemContainer
                }
                activeOpacity={0.9}
            >
                {image}

                <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
                    <Text
                        style={[styles.title, isDarkMode && styles.titleDark]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    <Text
                        style={[styles.subtext, isDarkMode && styles.subtextDark]}
                        numberOfLines={1}
                    >
                        {subtext}
                    </Text>
                </View>
            </TouchableOpacity>
        </MenuView>
    );
};

export default PlaylistItem;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    gridItemContainer: {
        marginVertical: 8,
        marginHorizontal: 8,
        alignItems: 'flex-start',
    },
    gridTextContainer: {
        marginTop: 4,
        width: '100%',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    titleDark: {
        color: '#ccc',
    },
    subtext: {
        fontSize: 14,
        color: '#666',
    },
    subtextDark: {
        color: '#aaa',
    },
});