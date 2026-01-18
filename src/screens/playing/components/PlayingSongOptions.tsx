import React, { useRef } from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaying } from '@/contexts/PlayingContext';
import PlaylistList from '@/components/PlaylistList';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { useLibrary } from '@/contexts/LibraryContext';

import { Song } from '@/types';
import { toast } from '@backpackapp-io/react-native-toast';

const PlayingSongOptions: React.FC<{ selectedSong: Song }> = ({ selectedSong }) => {
    const playlistRef = useRef<BottomSheet>(null);

    const { starred, starItem, unstarItem } = useLibrary();
    const {
        currentSong,
        addToQueue,
        playNext,
    } = usePlaying();

    const isStarred = starred.songs.some(s => s.id === selectedSong.id);

    const toggleFavorite = async () => {
        try {
            if (isStarred) {
                await unstarItem(selectedSong);
                toast.success(`${selectedSong.title} removed from favorites.`);
            } else {
                await starItem(selectedSong);
                toast.success(`${selectedSong.title} added to favorites.`);
            }
        } catch (err) {
            console.error('toggleFavorite error:', err);
            toast.error('Failed to update favorites.');
        }
    };

    const handleAddToQueue = async () => {
        try {
            await addToQueue(selectedSong);
            toast.success(`${selectedSong.title} added to queue.`);
        } catch (err) {
            console.error('addToQueue error:', err);
            toast.error('Failed to add to queue.');
        }
    };

    const handlePlayNext = async () => {
        if (!currentSong) {
            toast.error('Nothing is currently playing.');
            return;
        }

        if (selectedSong.id === currentSong.id) {
            toast.error(`${selectedSong.title} is already playing.`);
            return;
        }

        try {
            await playNext(selectedSong);
            toast.success(`${selectedSong.title} will play next.`);
        } catch (err) {
            console.error('playNext error:', err);
            toast.error('Failed to queue song next.');
        }
    };

    return (
        <>
            <MenuView
                title={selectedSong.title}
                actions={[
                    {
                        id: 'favorite',
                        title: isStarred ? 'Unfavorite' : 'Favorite',
                        image: Platform.select({
                            ios: isStarred ? 'heart.slash' : 'heart',
                            android: 'ic_heart',
                        }),
                        imageColor: '#fff',
                    },
                    {
                        id: 'play-next',
                        title: 'Play Next',
                        image: Platform.select({
                            ios: 'play.fill',
                            android: 'ic_play',
                        }),
                        imageColor: '#fff',
                    },
                    {
                        id: 'add-to-queue',
                        title: 'Add to Queue',
                        image: Platform.select({
                            ios: 'plus',
                            android: 'ic_plus',
                        }),
                        imageColor: '#fff',
                    },
                    {
                        id: 'add-to-playlist',
                        title: 'Add to Playlist',
                        image: Platform.select({
                            ios: 'text.badge.plus',
                            android: 'ic_playlist_add',
                        }),
                        imageColor: '#fff',
                    },
                ]}
                onPressAction={({ nativeEvent }) => {
                    switch (nativeEvent.event) {
                        case 'favorite':
                            toggleFavorite();
                            break;
                        case 'play-next':
                            handlePlayNext();
                            break;
                        case 'add-to-queue':
                            handleAddToQueue();
                            break;
                        case 'add-to-playlist':
                            playlistRef.current?.show();
                            break;
                        default:
                            console.warn(`Unhandled action: ${nativeEvent.event}`);
                    }
                }}
            >
                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons
                        name="ellipsis-horizontal"
                        size={22}
                        color='#fff'
                    />
                </TouchableOpacity>
            </MenuView>

            <PlaylistList
                ref={playlistRef}
                selectedSong={selectedSong}
                onClose={() => playlistRef.current?.close()}
            />
        </>
    );
};

export default PlayingSongOptions;

const styles = StyleSheet.create({
    moreButton: {
        padding: 8,
    },
});