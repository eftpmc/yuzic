import React, { useRef, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Platform,
    Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { useSettings } from '@/contexts/SettingsContext';

import Header from '../components/Header';
import ConfirmActionSheet from '@/components/ConfirmActionSheet';

import Stats from './components/Stats';
import AudioQuality from './components/AudioQuality';
import Downloads from './components/Downloads';

const LibrarySettings: React.FC = () => {
    const router = useRouter();
    const { themeColor } = useSettings();

    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const confirmSheetRef = useRef<BottomSheetModal>(null);
    const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const showConfirm = (action: () => void, message: string) => {
        setPendingAction(() => action);
        setConfirmMessage(message);
        confirmSheetRef.current?.present();
    };

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
                <Stats
                    onConfirm={showConfirm}
                />

                <AudioQuality />

                <Downloads
                    onConfirm={showConfirm}
                />
            </ScrollView>

            <ConfirmActionSheet
                ref={confirmSheetRef}
                title="Are you sure?"
                description={confirmMessage}
                themeColor={themeColor}
                onConfirm={() => {
                    pendingAction?.();
                    confirmSheetRef.current?.dismiss();
                }}
                onCancel={() => confirmSheetRef.current?.dismiss()}
            />
        </SafeAreaView>
    );
};

export default LibrarySettings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
});