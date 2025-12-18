import React, { useState, useEffect, useRef } from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Alert,
    Platform,
    View,
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer from 'react-native-track-player';
import { usePlaying } from '@/contexts/PlayingContext';
import PlaylistList from '@/components/PlaylistList';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { useSelector } from "react-redux";
import { selectStarred } from "@/utils/redux/librarySelectors";
import { useLibrary } from "@/contexts/LibraryContext";

import { Song } from '@/types';

const SongOptions: React.FC<{ selectedSong: Song }> = ({ selectedSong }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const playlistRef = useRef<BottomSheet>(null);
    const starred = useSelector(selectStarred);
    const { starItem, unstarItem } = useLibrary();
    const { currentSong } = usePlaying();

    const isStarred = starred.songIds.includes(selectedSong.id);

    const toggleFavorite = async () => {
        try {
            if (isStarred) {
                await unstarItem(selectedSong.id!);
                Alert.alert('Removed from Favorites', `${selectedSong.title} was removed from favorites.`);
            } else {
                await starItem(selectedSong.id!);
                Alert.alert('Added to Favorites', `${selectedSong.title} was added to favorites.`);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            Alert.alert('Error', 'Failed to update favorites.');
        }
    };

    const handleAddToQueue = async () => {
        if (selectedSong) {
            try {
                await TrackPlayer.add({
                    id: selectedSong.id,
                    title: selectedSong.title,
                    artist: selectedSong.artist,
                    artwork: selectedSong.cover,
                    url: selectedSong.streamUrl,
                    duration: parseFloat(selectedSong.duration),
                });
                Alert.alert('Success', `${selectedSong.title} has been added to the queue.`);
            } catch (error) {
                console.error('Add to queue error:', error);
                Alert.alert('Error', 'Failed to add to queue.');
            }
        }
    };

    const handlePlayNext = async () => {
        if (selectedSong && currentSong) {
            try {
                if (selectedSong.id === currentSong.id) {
                    Alert.alert('Already Playing', `${selectedSong.title} is currently playing.`);
                    return;
                }

                const currentIndex = await TrackPlayer.getCurrentTrack();
                const queue = await TrackPlayer.getQueue();

                // Remove any existing occurrence of the song
                const existingIndex = queue.findIndex((track) => track.id === selectedSong.id);
                if (existingIndex !== -1) {
                    await TrackPlayer.remove([existingIndex]);

                    // Adjust index if needed
                    if (existingIndex <= currentIndex && currentIndex > 0) {
                        await TrackPlayer.skip(currentIndex - 1);
                    }
                }

                // Insert after current track
                const insertIndex = currentIndex !== null ? currentIndex + 1 : queue.length;

                await TrackPlayer.add({
                    id: selectedSong.id,
                    title: selectedSong.title,
                    artist: selectedSong.artist,
                    artwork: selectedSong.cover,
                    url: selectedSong.streamUrl,
                    duration: parseFloat(selectedSong.duration),
                }, insertIndex);

                Alert.alert('Success', `${selectedSong.title} will play next.`);
            } catch (error) {
                console.error('Play next error:', error);
                Alert.alert('Error', 'Failed to queue song next.');
            }
        }
    };

    return (
        <>
            <MenuView
                title={selectedSong ? selectedSong.title : 'Options'}
                actions={[
                    {
                        id: 'favorite', title: isStarred ? 'Unfavorite' : 'Favorite', image: Platform.select({
                            ios: isStarred ? 'heart' : 'heart.fill',
                            android: 'ic_heart',
                        }), imageColor: "#fff",
                    },
                    {
                        id: 'play-next', title: 'Play Next', image: Platform.select({
                            ios: 'play.fill',
                            android: 'ic_play',
                        }), imageColor: "#fff",
                    },
                    {
                        id: 'add-to-queue', title: 'Add to Queue', image: Platform.select({
                            ios: 'plus',
                            android: 'ic_plus',
                        }), imageColor: "#fff",
                    },
                    {
                        id: 'add-to-playlist', title: 'Add to Playlist', image: Platform.select({
                            ios: 'plus',
                            android: 'ic_plus',
                        }), imageColor: "#fff",
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
                    <Ionicons name="ellipsis-horizontal" size={24} color={isDarkMode ? '#fff' : '#000'} />
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

export default SongOptions;

const styles = StyleSheet.create({
    moreButton: {
        padding: 8,
    },
});