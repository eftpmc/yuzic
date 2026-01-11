import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Appearance,
} from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { Song, CoverSource } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';

interface ItemProps {
    id: string;
    name: string;
    subtext: string;
    cover: CoverSource;
    isGridView: boolean;
    gridWidth: number;
}

const ArtistItem: React.FC<ItemProps> = ({
    id,
    name,
    subtext,
    cover,
    isGridView,
    gridWidth,
}) => {
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const api = useApi();
    const { playSongInCollection } = usePlaying();

    const handlePlay = useCallback(
        async (shuffle: boolean) => {
            const artist = await queryClient.fetchQuery({
                queryKey: [QueryKeys.Artist, id],
                queryFn: () => api.artists.get(id),
                staleTime: 10 * 60 * 1000,
            });

            if (!artist) return;

            const albumIds = artist.ownedAlbums.map(a => a.id);
            if (albumIds.length === 0) return;

            const albums = await Promise.all(
                albumIds.map(albumId =>
                    queryClient.fetchQuery({
                        queryKey: [QueryKeys.Album, albumId],
                        queryFn: () => api.albums.get(albumId),
                        staleTime: 5 * 60 * 1000,
                    })
                )
            );

            const songs: Song[] = albums.flatMap(a => a?.songs ?? []);
            if (songs.length === 0) return;

            playSongInCollection(
                songs[0],
                {
                    id: artist.id,
                    title: artist.name,
                    artist,
                    cover: artist.cover,
                    subtext: 'Artist',
                    userPlayCount: 0,
                    songs,
                },
                shuffle
            );
        },
        [id]
    );

    const handleNavigation = () => {
        navigation.navigate('artistView', { id });
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
            title: 'Go to Artist',
            image: 'music.note.list',
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
        }
    };

    return (
        <MenuView
            title={name || 'Options'}
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
                        {name}
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

export default ArtistItem;

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