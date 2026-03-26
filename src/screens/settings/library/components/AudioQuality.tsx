import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectAudioQuality } from '@/utils/redux/selectors/settingsSelectors';
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
    const audioQuality = useSelector(selectAudioQuality);
    const { colors } = useTheme();

    return (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.infoText, { color: colors.subtext }]}>
                {t('settings.library.audioQuality.info')}
            </Text>

            <View style={styles.optionList}>
                {QUALITY_OPTIONS.map(option => {
                    const selected = audioQuality === option.key;
                    return (
                        <TouchableOpacity
                            key={option.key}
                            onPress={() => dispatch(setAudioQuality(option.key))}
                            style={[styles.optionRow, {
                                backgroundColor: colors.muted,
                                borderColor: selected ? colors.themeColor : colors.border,
                            }]}
                        >
                            <View style={[styles.checkbox,
                                selected
                                    ? { backgroundColor: colors.themeColor, borderColor: colors.themeColor }
                                    : { borderColor: colors.border },
                            ]}>
                                {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={[styles.optionText, { color: colors.text }]}>
                                {t(option.labelKey)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default AudioQuality;

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 13,
        marginBottom: 12,
    },
    optionList: {
        gap: 6,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: 15,
        flex: 1,
    },
});
