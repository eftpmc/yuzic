import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import { ContextMenuView } from 'react-native-ios-context-menu';
import CoverArt from '@/components/CoverArt';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useDownload } from '@/contexts/DownloadContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { Song } from '@/types';

interface ItemProps {
    item: any;
    isGridView: boolean;
    isDarkMode: boolean;
    onPress: () => void;
    onPlay?: () => void;
    gridWidth?: number;
}

const Item: React.FC<ItemProps> = ({
    item,
    isGridView,
    isDarkMode,
    onPress,
    onPlay,
    gridWidth
}) => {
    const {
        downloadAlbumById,
        downloadPlaylistById,
        isAlbumDownloaded,
        isPlaylistDownloaded,
        isDownloadingAlbum,
        isDownloadingPlaylist
    } = useDownload();

    const { songs } = useLibrary();

    const { playSongInCollection } = usePlaying();

    const [isLoading, setIsLoading] = useState(false);

    const isDownloaded =
        item.type === 'Album'
            ? isAlbumDownloaded(item.id)
            : item.type === 'Playlist'
                ? isPlaylistDownloaded(item.id)
                : false;

    const handleDownload = async () => {
        if (isDownloaded || isLoading) return;
        setIsLoading(true);
        try {
            if (item.type === 'Album') await downloadAlbumById(item.id);
            if (item.type === 'Playlist') await downloadPlaylistById(item.id);
        } catch (err) {
            console.error(`Failed to download ${item.type.toLowerCase()}:`, err);
        } finally {
            setIsLoading(false);
        }
    };

    const cover = (
        <CoverArt
            source={item.cover ?? null}
            size={isGridView ? undefined : 50}
            isGrid={isGridView}
        />
    );

    const content = (
        <TouchableOpacity
            onPress={onPress}
            style={isGridView ? [styles.gridItemContainer, { width: gridWidth }] : styles.itemContainer}
            activeOpacity={0.9}
        >
            {isGridView ? (
                <View style={{ width: '100%' }}>{cover}</View>
            ) : (
                cover
            )}

            <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
                <Text
                    style={[styles.title, isDarkMode && styles.titleDark]}
                    numberOfLines={1}
                >
                    {item.title ?? item.name}
                </Text>
                <Text
                    style={[styles.subtext, isDarkMode && styles.subtextDark]}
                    numberOfLines={1}
                >
                    {item.subtext || item.type}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const getMenuItems = () => {
        const items: any[] = [];

        if (item.type === 'Album' || item.type === 'Playlist') {
            const isDownloading =
                item.type === 'Album'
                    ? isDownloadingAlbum(item.id)
                    : isDownloadingPlaylist(item.id);

            items.push({
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
                attributes: isDownloaded || isDownloading ? ['disabled'] : [],
                state: isDownloading || isLoading ? 'on' : 'off',
            });
        }

        switch (item.type) {
            case 'Album':
                items.unshift(
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
                        actionTitle: 'Go to Album',
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: { systemName: 'music.note.list' },
                        },
                    },
                );
                break;
            case 'Artist':
                items.unshift(
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
                );

                items.push({
                    actionKey: 'go-to',
                    actionTitle: 'Go to Artist',
                    icon: {
                        type: 'IMAGE_SYSTEM',
                        imageValue: { systemName: 'person.fill' },
                    },
                });
                break;
            case 'Playlist':
                items.unshift(
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
                            imageValue: { systemName: 'text.badge.plus' },
                        },
                    },
                );
                break;
        }

        return items;
    };

    const menuTitle = item.title || item.name || 'Options';

    if (Platform.OS === 'ios' && ['Album', 'Artist', 'Playlist'].includes(item.type)) {
        return (
            <ContextMenuView
                style={{ borderRadius: 8 }}
                previewConfig={{ previewType: 'none' }}
                menuConfig={{
                    menuTitle,
                    menuItems: getMenuItems(),
                }}
                onPressMenuItem={({ nativeEvent }) => {
                    switch (nativeEvent.actionKey) {
                        case 'shuffle':
                            if (item.type === 'Artist') {
                                const artistSongs = songs.filter((s: Song) => s.artist?.toLowerCase() === item.name.toLowerCase());
                                if (artistSongs.length > 0) {
                                    playSongInCollection(artistSongs[0], {
                                        id: item.id,
                                        title: item.name,
                                        artist: item.name,
                                        cover: item.cover,
                                        songs: artistSongs,
                                        type: 'playlist',
                                    }, true);
                                }
                            } else if (item.songs?.length > 0) {
                                playSongInCollection(item.songs[0], item, true);
                            }
                            break;

                        case 'play':
                            if (item.type === 'Artist') {
                                const artistSongs = songs.filter((s: Song) => s.artist?.toLowerCase() === item.name.toLowerCase());
                                if (artistSongs.length > 0) {
                                    playSongInCollection(artistSongs[0], {
                                        id: item.id,
                                        title: item.name,
                                        artist: item.name,
                                        cover: item.cover,
                                        songs: artistSongs,
                                        type: 'playlist',
                                    }, false);
                                }
                            } else if (item.songs?.length > 0) {
                                playSongInCollection(item.songs[0], item, false);
                            } else {
                                onPlay?.();
                            }
                            break;
                        case 'go-to':
                            onPress();
                            break;
                        case 'download':
                            handleDownload();
                            break;
                    }
                }}
            >
                {content}
            </ContextMenuView>
        );
    }

    return content;
};

export default Item;

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
        marginLeft: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000'
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