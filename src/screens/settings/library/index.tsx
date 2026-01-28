import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Platform,
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';

import Stats from './components/Stats';
import AudioQuality from './components/AudioQuality';
import Downloads from './components/Downloads';
import { useTheme } from '@/hooks/useTheme';

const LibrarySettings: React.FC = () => {
    const { isDarkMode } = useTheme();
    const router = useRouter();

    return (
        <SafeAreaView
            style={[
                styles.container,
                isDarkMode && styles.containerDark,
                Platform.OS === 'android' && { paddingTop: 24 },
            ]}
        >
            <Header title="Library" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Stats />
                <AudioQuality />
                <Downloads />

                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text
                        style={[
                            styles.sectionTitle,
                            isDarkMode && styles.sectionTitleDark,
                        ]}
                    >
                        Discovery
                    </Text>
                    <Text
                        style={[
                            styles.infoText,
                            isDarkMode && styles.infoTextDark,
                        ]}
                    >
                        How Discovery suggests artists and albums from your
                        library.
                    </Text>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/discoveryView')}
                    >
                        <Text
                            style={[
                                styles.rowText,
                                isDarkMode && styles.rowTextDark,
                            ]}
                        >
                            About discovery
                        </Text>
                        <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={isDarkMode ? '#fff' : '#6E6E73'}
                        />
                    </TouchableOpacity>
                </View>
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
    section: {
        marginBottom: 24,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    sectionDark: {
        backgroundColor: '#111',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 10,
    },
    sectionTitleDark: {
        color: '#fff',
    },
    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: {
        color: '#aaa',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    rowText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    rowTextDark: {
        color: '#fff',
    },
});