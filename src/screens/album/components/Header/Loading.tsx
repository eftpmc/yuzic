import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

const LoadingAlbumHeader: React.FC = () => {
    const { isDarkMode } = useTheme();

    const colorMode = isDarkMode ? 'dark' : 'light';

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Skeleton
                    width={24}
                    height={24}
                    radius={4}
                    colorMode={colorMode}
                />

                {/* Download button */}
                <Skeleton
                    width={24}
                    height={24}
                    radius={4}
                    colorMode={colorMode}
                />
            </View>

            {/* Cover art */}
            <View style={styles.coverWrapper}>
                <Skeleton
                    width={280}
                    height={280}
                    radius={16}
                    colorMode={colorMode}
                />
            </View>

            {/* Title + metadata */}
            <View style={styles.titleRow}>
                <View style={styles.titleInfo}>
                    {/* Album title */}
                    <Skeleton
                        width="80%"
                        height={24}
                        radius={6}
                        colorMode={colorMode}
                    />

                    {/* Artist row */}
                    <View style={styles.artistRow}>
                        <Skeleton
                            width={20}
                            height={20}
                            radius={10}
                            colorMode={colorMode}
                        />
                        <View style={{ width: 8 }} />
                        <Skeleton
                            width={120}
                            height={14}
                            radius={6}
                            colorMode={colorMode}
                        />
                    </View>

                    {/* Song count + duration */}
                    <View style={{ marginTop: 6 }}>
                        <Skeleton
                            width={160}
                            height={14}
                            radius={6}
                            colorMode={colorMode}
                        />
                    </View>
                </View>

                {/* Play button */}
                <Skeleton
                    width={48}
                    height={48}
                    radius={24}
                    colorMode={colorMode}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    headerRow: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    coverWrapper: {
        width: 280,
        height: 280,
        borderRadius: 16,
        marginTop: 32,
        marginBottom: 24,
        overflow: 'hidden',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    titleInfo: {
        flex: 1,
        paddingRight: 12,
    },
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
});

export default LoadingAlbumHeader;