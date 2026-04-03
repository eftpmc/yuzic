import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useEqualizer, useEqualizerPresets } from 'react-native-nitro-player';

const Equalizer: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const themeColor = useSelector(selectThemeColor);

    const {
        isEnabled,
        bands: allBands,
        setEnabled,
        setBandGain,
        reset,
        gainRange,
    } = useEqualizer();

    // Show 5 evenly-spread bands: ~60Hz, ~250Hz, ~1kHz, ~4kHz, ~16kHz
    const bands = allBands.filter(b => [1, 3, 5, 7, 9].includes(b.index));

    const { builtInPresets, currentPreset, applyPreset } = useEqualizerPresets();

    return (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                    {t('settings.player.equalizer.title')}
                </Text>
                <View style={styles.toggleGrid}>
                    <TouchableOpacity
                        onPress={() => setEnabled(false)}
                        style={[
                            styles.gridButton,
                            isDarkMode && styles.gridButtonDark,
                            !isEnabled && { backgroundColor: themeColor, borderColor: themeColor },
                        ]}
                        activeOpacity={0.8}
                    >
                        <X size={18} color={!isEnabled ? '#fff' : isDarkMode ? '#ccc' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setEnabled(true)}
                        style={[
                            styles.gridButton,
                            styles.gridButtonSpaced,
                            isDarkMode && styles.gridButtonDark,
                            isEnabled && { backgroundColor: themeColor, borderColor: themeColor },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Check size={18} color={isEnabled ? '#fff' : isDarkMode ? '#ccc' : '#666'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Presets */}
            <View style={{ opacity: isEnabled ? 1 : 0.4 }}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    {t('settings.player.equalizer.presets')}
                </Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.presetScroll}
                    contentContainerStyle={styles.presetRow}
                >
                    {builtInPresets.map(preset => {
                        const active = currentPreset === preset.name;
                        return (
                            <TouchableOpacity
                                key={preset.name}
                                disabled={!isEnabled}
                                onPress={() => applyPreset(preset.name)}
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
            <View style={[styles.bandsContainer, { opacity: isEnabled ? 1 : 0.4 }]}>
                {bands.map(band => (
                    <View key={band.index} style={styles.bandColumn}>
                        <Text
                            style={[
                                styles.dbLabel,
                                { color: isDarkMode ? '#ccc' : '#333' },
                            ]}
                        >
                            {band.gainDb > 0 ? '+' : ''}
                            {Math.round(band.gainDb)}
                        </Text>

                        <View style={styles.sliderWrapper}>
                            <Slider
                                style={styles.slider}
                                minimumValue={gainRange.min}
                                maximumValue={gainRange.max}
                                step={0.5}
                                value={band.gainDb}
                                disabled={!isEnabled}
                                onSlidingComplete={(value) => setBandGain(band.index, value)}
                                minimumTrackTintColor={themeColor}
                                maximumTrackTintColor={isDarkMode ? '#333' : '#ddd'}
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
                disabled={!isEnabled}
                onPress={reset}
                style={[styles.resetButton, { opacity: isEnabled ? 1 : 0.4 }]}
            >
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
        textAlign: 'center',
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
    toggleGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    gridButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f1f1',
        borderColor: '#ddd',
        borderWidth: 1,
    },
    gridButtonDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    gridButtonSpaced: {
        marginLeft: 8,
    },
});
