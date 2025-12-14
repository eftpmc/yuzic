import React, { useEffect, useState } from 'react';
import { View, Text, useColorScheme, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumData } from '@/types';
import { useApi } from '@/api';

import List from './components/List';
import LList from './components/loading/List';

const AlbumScreen: React.FC = () => {
    const route = useRoute<any>();
    const { id } = route.params;

    const api = useApi();
    const isDarkMode = useColorScheme() === 'dark';

    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadAlbum = async () => {
            try {
                setIsLoading(true);
                const result = await api.albums.get(id);
                if (mounted) setAlbum(result);
            } catch {
                if (mounted) setAlbum(null);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadAlbum();

        return () => {
            mounted = false;
        };
    }, [id]);

    if (isLoading) {
        return (
            <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
                <LList />
            </SafeAreaView>
        );
    }

    if (!album) {
        return (
            <SafeAreaView style={styles.screen(isDarkMode)}>
                <Text style={styles.error(isDarkMode)}>Album not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
            <List album={album} />
        </SafeAreaView>
    );
};

export default AlbumScreen;

const styles = StyleSheet.create({
    screen: (isDark: boolean) => ({
        flex: 1,
        backgroundColor: isDark ? '#000' : '#fff',
    }),
    error: (isDark: boolean) => ({
        color: isDark ? '#fff' : '#000',
        textAlign: 'center',
        marginTop: 32,
        fontSize: 16,
    }),
});