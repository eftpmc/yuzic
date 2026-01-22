import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePlaying } from '@/contexts/PlayingContext';
import { useStarSong, useUnstarSong, useStarredSongs } from '@/hooks/starred';
import { PlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { toast } from '@backpackapp-io/react-native-toast';

export type PlayingBarActionConfig = {
    id: PlayingBarAction;
    icon: React.ReactNode;
    onPress: () => void;
};

export function usePlayingBarAction(
    id: PlayingBarAction
): PlayingBarActionConfig | null {
    const { skipToNext, currentSong } = usePlaying();
    const { songs: starredSongs } = useStarredSongs();
    const star = useStarSong();
    const unstar = useUnstarSong();

    const isFavorite =
        !!currentSong &&
        starredSongs.some(s => s.id === currentSong.id);

    switch (id) {
        case 'skip':
            return {
                id,
                icon: (
                    <Ionicons
                        name="play-skip-forward"
                        size={20}
                        color="#fff"
                    />
                ),
                onPress: skipToNext,
            };

        case 'favorite':
            return {
                id,
                icon: (
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color="#fff"
                    />
                ),
                onPress: async () => {
                    if (!currentSong) return;

                    try {
                        if (isFavorite) {
                            await unstar.mutateAsync(currentSong.id);
                            toast.success(
                                `${currentSong.title} removed from favorites.`
                            );
                        } else {
                            await star.mutateAsync(currentSong.id);
                            toast.success(
                                `${currentSong.title} added to favorites.`
                            );
                        }
                    } catch {
                        toast.error('Failed to update favorites.');
                    }
                },
            };
        case 'none':
        default:
            return null;
    }
}