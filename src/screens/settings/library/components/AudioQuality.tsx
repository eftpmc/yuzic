import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectAudioQuality, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setAudioQuality } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

const QUALITY_OPTIONS = [
    { key: 'low' as const, labelKey: 'settings.library.audioQuality.options.low' },
    { key: 'medium' as const, labelKey: 'settings.library.audioQuality.options.medium' },
    { key: 'high' as const, labelKey: 'settings.library.audioQuality.options.high' },
    { key: 'original' as const, labelKey: 'settings.library.audioQuality.options.original' },
] as const;

const AudioQuality: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const themeColor = useSelector(selectThemeColor);
    const audioQuality = useSelector(selectAudioQuality);
    const { isDarkMode } = useTheme();
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                {t('settings.library.audioQuality.info')}
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
                        {t('settings.library.audioQuality.label', { value: t(`settings.library.audioQuality.options.${audioQuality}`) })}
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
                                    {t(option.labelKey)}
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