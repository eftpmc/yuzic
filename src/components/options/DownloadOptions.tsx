import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    View,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DownloadOptionsProps {
    onDownload: () => void;
    isDownloaded: boolean;
    isLoading?: boolean;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ onDownload, isDownloaded, isLoading = false }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    return (
        <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
                if (!isDownloaded && !isLoading) onDownload();
            }}
            disabled={isDownloaded || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
            ) : (
                <Ionicons
                    name={isDownloaded ? 'checkmark-done' : 'download-outline'}
                    size={22}
                    color={isDarkMode ? '#fff' : '#000'}
                />
            )}
        </TouchableOpacity>
    );
};

export default DownloadOptions;

const styles = StyleSheet.create({
    iconButton: {
        padding: 8,
    },
});