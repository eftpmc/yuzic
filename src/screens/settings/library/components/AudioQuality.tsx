import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectAudioQuality, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setAudioQuality } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

const QUALITY_OPTIONS = [
    { key: 'low', label: 'Low (64kbps)' },
    { key: 'medium', label: 'Medium (128kbps)' },
    { key: 'high', label: 'High (192kbps)' },
    { key: 'original', label: 'Original (no compression)' },
] as const;

const AudioQuality: React.FC = () => {
    const dispatch = useDispatch();
    const themeColor = useSelector(selectThemeColor);
    const audioQuality = useSelector(selectAudioQuality);
    const { isDarkMode } = useTheme();
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                Set your preferred audio quality for offline downloads.
            </Text>

            <TouchableOpacity
                style={[styles.optionButton, isDarkMode && styles.optionButtonDark]}
                onPress={() => setExpanded(prev => !prev)}
            >
                <View style={styles.leftGroup}>
                    <MaterialIcons
                        name="graphic-eq"
                        size={20}
                        color={isDarkMode ? '#ccc' : '#666'}
                        style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                        Audio Quality:{' '}
                        {audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)}
                    </Text>
                </View>

                <MaterialIcons
                    name={expanded ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={isDarkMode ? '#ccc' : '#666'}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.qualityList}>
                    {QUALITY_OPTIONS.map(option => {
                        const selected = audioQuality === option.key;

                        return (
                            <TouchableOpacity
                                key={option.key}
                                onPress={() => {
                                    dispatch(setAudioQuality(option.key));
                                    setExpanded(false);
                                }}
                                style={[
                                    styles.qualityItem,
                                    {
                                        backgroundColor: selected
                                            ? themeColor
                                            : isDarkMode
                                                ? '#1a1a1a'
                                                : '#f1f1f1',
                                        borderColor: selected
                                            ? themeColor
                                            : isDarkMode
                                                ? '#333'
                                                : '#ddd',
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: selected
                                            ? '#fff'
                                            : isDarkMode
                                                ? '#ccc'
                                                : '#333',
                                        fontWeight: selected ? '600' : '400',
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default AudioQuality;

const styles = StyleSheet.create({
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
    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: {
        color: '#aaa',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f1f1',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    optionButtonDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowText: {
        fontSize: 16,
        color: '#000',
    },
    rowTextDark: {
        color: '#fff',
    },
    qualityList: {
        marginTop: 12,
    },
    qualityItem: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        marginBottom: 6,
        borderWidth: 1,
    },
});