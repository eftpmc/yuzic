import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Header from '../components/Header';

import Stats from './components/Stats';
import AudioQuality from './components/AudioQuality';
import Downloads from './components/Downloads';
import LibrarySelect from './components/LibrarySelect';
import { useTheme } from '@/hooks/useTheme';
import PendingOfflineChanges from './components/PendingOfflineChanges';

const LibrarySettings: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();

    return (
        <SafeAreaView
            style={[
                styles.container,
                isDarkMode && styles.containerDark,
                Platform.OS === 'android' && { paddingTop: 24 },
            ]}
        >
            <Header title={t('settings.library.title')} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <PendingOfflineChanges />
                <Stats />
                <LibrarySelect />
                <Downloads />
                <AudioQuality />
            </ScrollView>
        </SafeAreaView>
    );
};

export default LibrarySettings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
});
