import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GripVertical } from 'lucide-react-native';
import TrackPlayer from 'react-native-track-player';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLibrary } from "@/contexts/LibraryContext";
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectAlbumList } from '@/utils/redux/librarySelectors';
import { useSelector } from 'react-redux';

const Queue: React.FC<{ onBack: () => void, width: number }> = ({ onBack, width }) => {
    const { getQueue, currentSong, skipTo, moveTrack, isPlaying, pauseSong, resumeSong, skipToNext } = usePlaying();
    const { themeColor } = useSettings();
    const albums = useSelector(selectAlbumList)
    const [queue, setQueue] = useState<any[]>([]);
    const currentIndex = queue.findIndex((song) => song.id === currentSong?.id);

    useFocusEffect(
        React.useCallback(() => {
            getQueue().then(q => setQueue(q));
        }, [currentSong?.id])
    );

    const currentAlbum = albums.find(album =>
        album.songs?.some(song => song.id === currentSong?.id)
    );

    const handleSongClick = async (index: number) => {
        await skipTo(index);
    };


    const renderQueueItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
        const index = getIndex?.() ?? 0;
        return (
            <TouchableOpacity
                onPress={() => handleSongClick(index)}
                onLongPress={drag}
                disabled={isActive}
                style={[
                    styles.queueItem,
                    item.id === currentSong?.id && styles.activeQueueItem,
                ]}
            >
                <Image source={{ uri: item.cover || item.artwork }} style={styles.artwork} />
                <View style={styles.metadata}>
                    <Text style={[styles.title, item.id === currentSong?.id && { fontWeight: "bold" }]}>
                        {item.title}
                    </Text>
                    <Text style={styles.artist}>{item.artist}</Text>
                </View>
                <GripVertical color="#888" />
            </TouchableOpacity>
        );
    }, [currentIndex, currentSong?.id, themeColor]);

    return (
        <View style={[styles.container, { width }]}>
            <View style={styles.header}>
                <Image source={{ uri: currentSong?.cover }} style={styles.headerImage} />
                <View style={styles.headerTextContainer}>
                    <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentSong?.title}</Text>
                    <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentSong?.artist}</Text>
                </View>
                <View style={styles.playControls}>
                    <TouchableOpacity onPress={isPlaying ? pauseSong : resumeSong} style={styles.controlButton}>
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={skipToNext} style={styles.controlButton}>
                        <Ionicons name="play-skip-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionLabel}>Queue</Text>
            <Text style={styles.subLabel}>
                {currentAlbum ? `Playing from ${currentAlbum.title}` : 'Playing from Queue'}
            </Text>

            <View style={styles.scrollWrapper}>
                <DraggableFlatList
                    data={queue}
                    keyExtractor={item => item.id}
                    renderItem={renderQueueItem}
                    onDragEnd={async ({ from, to, data }) => {
                        setQueue(data);
                        await moveTrack(from, to);
                    }}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    removeClippedSubviews={true}
                    getItemLayout={(_, index) => ({
                        length: 70,
                        offset: 70 * index,
                        index,
                    })}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 32,
        paddingHorizontal: 16,
    },
    scrollWrapper: {
        flex: 1,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    playControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },

    controlButton: {
        padding: 6,
        marginLeft: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    headerImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    nowPlayingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    nowPlayingArtist: {
        fontSize: 14,
        color: '#aaa',
    },
    activeQueueItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    subLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 12,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12, // Use padding instead of margin
        borderRadius: 10,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    metadata: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        color: '#fff',
    },
    artist: {
        fontSize: 14,
        color: '#aaa',
    },
    flatListContent: {
        paddingBottom: 100, // for utility buttons spacing
    },
});

export default Queue;