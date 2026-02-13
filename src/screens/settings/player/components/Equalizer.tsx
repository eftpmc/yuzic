import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useEqualizer } from 'react-native-nitro-player';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

const PRESETS = [
    { name: 'Flat', gains: [0, 0, 0, 0, 0] },
    { name: 'Bass Boost', gains: [6, 4, 0, 0, 0] },
    { name: 'Treble Boost', gains: [0, 0, 0, 4, 6] },
    { name: 'Vocal', gains: [-2, 0, 4, 4, 0] },
    { name: 'Rock', gains: [4, 2, -1, 3, 5] },
    { name: 'Pop', gains: [-1, 2, 4, 2, -1] },
    { name: 'Jazz', gains: [3, 1, -1, 2, 4] },
];

const Equalizer: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const themeColor = useSelector(selectThemeColor);

    const {
        isEnabled,
        setEnabled,
        bands,
        setBandGain,
        setAllBandGains,
        reset,
    } = useEqualizer();

    const [activePreset, setActivePreset] = useState<string | null>(null);

    const handlePreset = (preset: typeof PRESETS[number]) => {
        setAllBandGains(preset.gains);
        setActivePreset(preset.name);
    };

    const handleBandChange = (index: number, value: number) => {
        setBandGain(index, value);
        setActivePreset(null);
    };

    const handleReset = () => {
        reset();
        setActivePreset('Flat');
    };

    const handleToggle = () => {
        setEnabled(!isEnabled);
    };

    const disabledOpacity = isEnabled ? 1 : 0.4;

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                    {t('settings.player.equalizer.title')}
                </Text>

                <TouchableOpacity
                    onPress={handleToggle}
                    style={[
                        styles.toggleButton,
                        {
                            backgroundColor: isEnabled
                                ? themeColor
                                : isDarkMode
                                    ? '#222'
                                    : '#eee',
                            borderColor: isEnabled
                                ? themeColor
                                : isDarkMode
                                    ? '#444'
                                    : '#ccc',
                        },
                    ]}
                >
                    <MaterialIcons
                        name="equalizer"
                        size={20}
                        color={isEnabled ? '#fff' : isDarkMode ? '#888' : '#999'}
                    />
                </TouchableOpacity>
            </View>

            {/* Presets */}
            <View style={{ opacity: disabledOpacity }}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    {t('settings.player.equalizer.presets')}
                </Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.presetScroll}
                    contentContainerStyle={styles.presetRow}
                >
                    {PRESETS.map(preset => {
                        const active = activePreset === preset.name;
                        return (
                            <TouchableOpacity
                                key={preset.name}
                                onPress={() => handlePreset(preset)}
                                disabled={!isEnabled}
                                style={[
                                    styles.presetPill,
                                    {
                                        backgroundColor: active
                                            ? themeColor
                                            : isDarkMode
                                                ? '#1a1a1a'
                                                : '#f1f1f1',
                                        borderColor: active
                                            ? themeColor
                                            : isDarkMode
                                                ? '#333'
                                                : '#ddd',
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.presetText,
                                        {
                                            color: active
                                                ? '#fff'
                                                : isDarkMode
                                                    ? '#ccc'
                                                    : '#333',
                                            fontWeight: active ? '600' : '400',
                                        },
                                    ]}
                                >
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Band Sliders */}
            <View style={[styles.bandsContainer, { opacity: disabledOpacity }]}>
                {bands.map(band => (
                    <View key={band.index} style={styles.bandColumn}>
                        <Text
                            style={[
                                styles.dbLabel,
                                {
                                    color: isDarkMode ? '#ccc' : '#333',
                                },
                            ]}
                        >
                            {band.gainDb > 0 ? '+' : ''}
                            {Math.round(band.gainDb)}
                        </Text>

                        <View style={styles.sliderWrapper}>
                            <Slider
                                style={styles.slider}
                                minimumValue={-12}
                                maximumValue={12}
                                step={0.5}
                                value={band.gainDb}
                                onSlidingComplete={(value) =>
                                    handleBandChange(band.index, value)
                                }
                                disabled={!isEnabled}
                                minimumTrackTintColor={themeColor}
                                maximumTrackTintColor={
                                    isDarkMode ? '#333' : '#ddd'
                                }
                                thumbTintColor={themeColor}
                            />
                        </View>

                        <Text
                            style={[
                                styles.freqLabel,
                                isDarkMode && styles.freqLabelDark,
                            ]}
                        >
                            {band.frequencyLabel}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Reset */}
            <TouchableOpacity
                onPress={handleReset}
                disabled={!isEnabled}
                style={[styles.resetButton, { opacity: disabledOpacity }]}
            >
                <MaterialIcons
                    name="refresh"
                    size={16}
                    color={isDarkMode ? '#aaa' : '#555'}
                />
                <Text style={[styles.resetText, isDarkMode && styles.resetTextDark]}>
                    {t('settings.player.equalizer.reset')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default Equalizer;

const styles = StyleSheet.create({
    section: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#fff',
        marginBottom: 24,
    },
    sectionDark: {
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    titleDark: {
        color: '#fff',
    },
    toggleButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 13,
        color: '#555',
        marginBottom: 10,
    },
    labelDark: {
        color: '#aaa',
    },
    presetScroll: {
        marginBottom: 20,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
    },
    presetPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 13,
    },
    bandsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    bandColumn: {
        flex: 1,
        alignItems: 'center',
    },
    dbLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 8,
    },
    sliderWrapper: {
        height: 150,
        justifyContent: 'center',
    },
    slider: {
        width: 150,
        height: 40,
        transform: [{ rotate: '-90deg' }],
    },
    freqLabel: {
        fontSize: 11,
        color: '#555',
        marginTop: 8,
    },
    freqLabelDark: {
        color: '#aaa',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    resetText: {
        fontSize: 13,
        color: '#555',
    },
    resetTextDark: {
        color: '#aaa',
    },
});
