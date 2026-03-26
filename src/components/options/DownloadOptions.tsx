import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Check, Download } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface DownloadOptionsProps {
    onDownload: () => void;
    isDownloaded: boolean;
    isLoading?: boolean;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ onDownload, isDownloaded, isLoading = false }) => {
    const { isDarkMode } = useTheme();
    const iconColor = isDarkMode ? '#fff' : '#000';

    return (
        <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
                if (!isDownloaded && !isLoading) onDownload();
            }}
            disabled={isDownloaded || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={iconColor} />
            ) : isDownloaded ? (
                <Check size={22} color={iconColor} />
            ) : (
                <Download size={22} color={iconColor} />
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
