import React, { useState, useMemo, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import ReorderableList, {
    reorderItems,
    useReorderableDrag,
} from 'react-native-reorderable-list';
import { Gesture } from 'react-native-gesture-handler';
import { GripVertical } from 'lucide-react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { MediaImage } from '@/components/MediaImage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type QueueItemProps = {
    item: any;
    index: number;
    isCurrent: boolean;
    onPress: (index: number) => void;
};

const QueueItem = memo(({ item, index, isCurrent, onPress }: QueueItemProps) => {
    const drag = useReorderableDrag();

    return (
        <TouchableOpacity
            onPress={() => onPress(index)}
            onLongPress={drag}
            style={[
                styles.queueItem,
                isCurrent && styles.activeQueueItem,
            ]}
        >
            <MediaImage
                cover={item.cover}
                size="thumb"
                style={styles.artwork}
            />

            <View style={styles.metadata}>
                <Text
                    style={[
                        styles.title,
                        isCurrent && { fontWeight: 'bold' },
                    ]}
                    numberOfLines={1}
                >
                    {item.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {item.artist}
                </Text>
            </View>

            <GripVertical color="#888" />
        </TouchableOpacity>
    );
});

const Queue: React.FC<{ onBack: () => void; width: number }> = ({
    onBack,
    width,
}) => {
    const {
        getQueue,
        currentSong,
        skipTo,
        moveTrack,
        isPlaying,
        pauseSong,
        resumeSong,
        skipToNext,
        queueVersion,
    } = usePlaying();

    const { albums } = useLibrary();

    const [queue, setQueue] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            setQueue(getQueue());
        }, [queueVersion])
    );

    const currentAlbum = albums.find(
        album => album.id === currentSong?.albumId
    );

    const handleSongClick = useCallback((index: number) => {
        skipTo(index);
    }, []);

    const handleReorder = useCallback(
        ({ from, to }: { from: number; to: number }) => {
            setQueue(prev => reorderItems(prev, from, to));
            moveTrack(from, to);
        },
        []
    );

    const panGesture = useMemo(
        () => Gesture.Pan().activateAfterLongPress(520),
        []
    );

    return (
        <View style={[styles.container, { width }]}>
            <View style={styles.header}>
                {currentSong ? (
                    <MediaImage
                        cover={currentSong.cover}
                        size="thumb"
                        style={styles.headerImage}
                    />
                ) : null}
                <View style={styles.headerTextContainer}>
                    <Text
                        style={styles.nowPlayingTitle}
                        numberOfLines={1}
                    >
                        {currentSong?.title}
                    </Text>
                    <Text
                        style={styles.nowPlayingArtist}
                        numberOfLines={1}
                    >
                        {currentSong?.artist}
                    </Text>
                </View>
                <View style={styles.playControls}>
                    <TouchableOpacity
                        onPress={isPlaying ? pauseSong : resumeSong}
                        style={styles.controlButton}
                    >
                        <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={skipToNext}
                        style={styles.controlButton}
                    >
                        <Ionicons
                            name="play-skip-forward"
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionLabel}>Queue</Text>
            <Text style={styles.subLabel}>
                {currentAlbum
                    ? `Playing from ${currentAlbum.title}`
                    : 'Playing from Queue'}
            </Text>

            <View style={styles.scrollWrapper}>
                <ReorderableList
                    data={queue}
                    keyExtractor={item => item.id}
                    onReorder={handleReorder}
                    panGesture={panGesture}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <QueueItem
                            item={item}
                            index={index}
                            isCurrent={item.id === currentSong?.id}
                            onPress={handleSongClick}
                        />
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 16,
    },
    scrollWrapper: {
        flex: 1,
        paddingBottom: 120,
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
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    activeQueueItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
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
});

export default Queue;