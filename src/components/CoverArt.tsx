import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ThemedHeartCover from './ThemedHeartCover';

interface CoverArtProps {
    source: string | null;
    size?: number;
    isGrid?: boolean;
}

const CoverArt: React.FC<CoverArtProps> = React.memo(({ source, size = 50, isGrid = false }) => {
    const borderRadius = isGrid ? 8 : 4;

    if (source === 'heart-icon') {
        return (
            <View
                style={{
                    width: isGrid ? '100%' : size,
                    aspectRatio: isGrid ? 1 : undefined,
                    height: isGrid ? undefined : size,
                    borderRadius,
                    overflow: 'hidden',
                    marginRight: isGrid ? 0 : 12,
                }}
            >
                <ThemedHeartCover size={isGrid ? undefined : size} />
            </View>
        );
    }

    if (!source) {
        return (
            <View
                style={{
                    width: isGrid ? '100%' : size,
                    aspectRatio: isGrid ? 1 : undefined,
                    height: isGrid ? undefined : size,
                    borderRadius,
                    backgroundColor: '#ccc',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: isGrid ? 0 : 12,
                }}
            >
                <Ionicons name="musical-notes-outline" size={size * 0.5} color="#999" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: source }}
            style={{
                width: isGrid ? '100%' : size,
                aspectRatio: isGrid ? 1 : undefined,
                height: isGrid ? undefined : size,
                borderRadius,
                marginRight: isGrid ? 0 : 12,
            }}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            priority="low"
        />
    );
});

export default CoverArt;