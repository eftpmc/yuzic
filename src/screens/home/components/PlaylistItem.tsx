import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { ContextMenuView } from 'react-native-ios-context-menu';
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
    isDarkMode: boolean;
    gridWidth: number;
}

const PlaylistItem: React.FC<ItemProps> = ({
    id,
    title,
    subtext,
    cover,
    isGridView,
    isDarkMode,
    gridWidth,
}) => {
    const {
        downloadPlaylistById,
        isPlaylistDownloaded,
        isDownloadingPlaylist,
    } = useDownload();

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

    const content = (
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
    );

    const menuTitle = title || 'Options';

    if (Platform.OS === 'ios') {
        return (
            <ContextMenuView
                style={{ borderRadius: 8 }}
                previewConfig={{ previewType: 'none' }}
                menuConfig={{
                    menuTitle,
                    menuItems: [
                        {
                            actionKey: 'play',
                            actionTitle: 'Play',
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: { systemName: 'play.fill' },
                            },
                        },
                        {
                            actionKey: 'shuffle',
                            actionTitle: 'Shuffle',
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: { systemName: 'shuffle' },
                            },
                        },
                        {
                            actionKey: 'go-to',
                            actionTitle: 'Go to Playlist',
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: { systemName: 'music.note.list' },
                            },
                        },
                        {
                            actionKey: 'download',
                            actionTitle: isDownloading
                                ? 'Downloading...'
                                : isDownloaded
                                ? 'Downloaded'
                                : 'Download',
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: {
                                    systemName: isDownloading
                                        ? 'hourglass'
                                        : isDownloaded
                                        ? 'checkmark.circle'
                                        : 'arrow.down.circle',
                                },
                            },
                            attributes:
                                isDownloaded || isDownloading ? ['disabled'] : [],
                        },
                    ],
                }}
                onPressMenuItem={({ nativeEvent }) => {
                    if (nativeEvent.actionKey === 'play') handlePlay(false);
                    if (nativeEvent.actionKey === 'shuffle') handlePlay(true);
                    if (nativeEvent.actionKey === 'go-to') handleNavigation();
                    if (nativeEvent.actionKey === 'download') handleDownload();
                }}
            >
                {content}
            </ContextMenuView>
        );
    }

    return content;
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