import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/api';
import { CheckCircle, XCircle } from 'lucide-react-native';

import Header from '../components/Header';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import {
    selectSearchScope,
    selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { setSearchScope } from '@/utils/redux/slices/settingsSlice';

const ICON_SIZE = 20;

const ServerSettings: React.FC = () => {
    const { isDarkMode } = useTheme();
    const { t } = useTranslation();
    const api = useApi();
    const dispatch = useDispatch();

    const searchScope = useSelector(selectSearchScope);
    const themeColor = useSelector(selectThemeColor);
    const activeServer = useSelector(selectActiveServer);

    const [isLoading, setIsLoading] = useState(false);


    if (!activeServer) {
        return null;
    }

    const { serverUrl, username, isAuthenticated } = activeServer;

    useEffect(() => {
        if (!api || !serverUrl) {
            return;
        }

        let cancelled = false;
        const timeout = setTimeout(async () => {
            setIsLoading(true);
            try {
                await api.auth.ping();
            } catch {
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [serverUrl]);

    return (
        <SafeAreaView
            style={[
                styles.container,
                isDarkMode && styles.containerDark,
                Platform.OS === 'android' && { paddingTop: 24 },
            ]}
        >
            <Header title={t('settings.server.title')} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                        {t('settings.server.serverUrl')}
                    </Text>
                    <TextInput
                        numberOfLines={1}
                        value={serverUrl || ''}
                        editable={false}
                        placeholder={t('settings.server.notSet')}
                        placeholderTextColor="#888"
                        style={[styles.input, isDarkMode && styles.inputDark]}
                    />

                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                        {t('settings.server.username')}
                    </Text>
                    <TextInput
                        numberOfLines={1}
                        value={username || ''}
                        editable={false}
                        placeholder={t('settings.server.notSet')}
                        placeholderTextColor="#888"
                        style={[
                            styles.inputNoMargin,
                            isDarkMode && styles.inputDark,
                        ]}
                    />

                    <View style={{ height: 16 }} />

                    <View style={styles.row}>
                        <Text
                            style={[
                                styles.rowText,
                                isDarkMode && styles.rowTextDark,
                            ]}
                        >
                            {t('settings.server.connectivity')}
                        </Text>

                        <View style={styles.iconSlot}>
                            {isLoading ? (
                                <SpinningLoaderCircle size={ICON_SIZE} color={themeColor} />
                            ) : isAuthenticated ? (
                                <CheckCircle size={ICON_SIZE} color={themeColor} />
                            ) : (
                                <XCircle size={ICON_SIZE} color="red" />
                            )}
                        </View>
                    </View>
                </View>

                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text
                        style={[
                            styles.infoText,
                            isDarkMode && styles.infoTextDark,
                        ]}
                    >
                        {t('settings.server.searchScopeHelp')}
                    </Text>

                    <View style={styles.scopeRow}>
                        {[
                            { key: 'client', label: t('settings.server.searchScope.client') },
                            { key: 'client+external', label: t('settings.server.searchScope.clientExternal') },
                            { key: 'server', label: t('settings.server.searchScope.server') },
                            {
                                key: 'server+external',
                                label: t('settings.server.searchScope.serverExternal'),
                            },
                        ].map(option => {
                            const active = searchScope === option.key;

                            return (
                                <View
                                    key={option.key}
                                    style={[
                                        styles.columnButton,
                                        {
                                            backgroundColor: active
                                                ? themeColor
                                                : isDarkMode
                                                ? '#222'
                                                : '#eee',
                                            borderColor: isDarkMode
                                                ? '#444'
                                                : '#ccc',
                                        },
                                    ]}
                                    onTouchEnd={() =>
                                        dispatch(
                                            setSearchScope(option.key as any)
                                        )
                                    }
                                >
                                    <Text
                                        style={{
                                            color: active
                                                ? '#fff'
                                                : isDarkMode
                                                ? '#ccc'
                                                : '#000',
                                            fontWeight: active ? '600' : '400',
                                            fontSize: 13,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {option.label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ServerSettings;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    containerDark: { backgroundColor: '#000' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: {
        backgroundColor: '#fff',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 24,
    },
    sectionDark: { backgroundColor: '#111' },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    labelDark: { color: '#fff' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    inputNoMargin: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 0,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    inputDark: {
        borderColor: '#444',
        backgroundColor: '#1a1a1a',
        color: '#fff',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    iconSlot: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: { color: '#aaa' },
    scopeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    columnButton: {
        flexBasis: '48%',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
});