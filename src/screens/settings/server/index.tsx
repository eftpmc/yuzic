import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Switch,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/api';
import { CheckCircle, XCircle } from 'lucide-react-native';

import Header from '../components/Header';
import ChecklistSection from '../components/ChecklistSection';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import {
    selectSearchScope,
    selectThemeColor,
    selectServerScrobbleEnabled,
    selectServerNowPlayingEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
    setSearchScope,
    setServerScrobbleEnabled,
    setServerNowPlayingEnabled,
    type SearchScope,
} from '@/utils/redux/slices/settingsSlice';

const ICON_SIZE = 20;

const ServerSettings: React.FC = () => {
    const { isDarkMode } = useTheme();
    const { t } = useTranslation();
    const api = useApi();
    const dispatch = useDispatch();

    const searchScope = useSelector(selectSearchScope);
    const themeColor = useSelector(selectThemeColor);
    const activeServer = useSelector(selectActiveServer);
    const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
    const serverNowPlayingEnabled = useSelector(selectServerNowPlayingEnabled);
    const isNavidrome = activeServer?.type === 'navidrome';

    const [isLoading, setIsLoading] = useState(false);

    const serverUrl = activeServer?.serverUrl;
    const username = activeServer?.username;
    const isAuthenticated = activeServer?.isAuthenticated;

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
    }, [api, serverUrl]);

    if (!activeServer) return null;

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
                    <View style={styles.row}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            {t('settings.server.serverUrl')}
                        </Text>
                        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]} numberOfLines={1}>
                            {serverUrl || t('settings.server.notSet')}
                        </Text>
                    </View>

                    <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                    <View style={styles.row}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            {t('settings.server.username')}
                        </Text>
                        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]} numberOfLines={1}>
                            {username || t('settings.server.notSet')}
                        </Text>
                    </View>

                    <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                    <View style={styles.row}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
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

                <ChecklistSection
                    infoText={t('settings.server.searchScopeHelp')}
                    items={[
                        { key: 'client', label: t('settings.server.searchScope.client') },
                        { key: 'server', label: t('settings.server.searchScope.server') },
                    ]}
                    isSelected={key => searchScope === key}
                    onSelect={key => dispatch(setSearchScope(key as SearchScope))}
                />

                {isNavidrome && (
                    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                    {t('settings.scrobbling.scrobble')}
                                </Text>
                                <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                                    {t('settings.scrobbling.scrobbleDescription')}
                                </Text>
                            </View>
                            <Switch
                                value={serverScrobbleEnabled}
                                onValueChange={v => { dispatch(setServerScrobbleEnabled(v)) }}
                                trackColor={{ true: themeColor }}
                                thumbColor="#fff"
                            />
                        </View>
                        <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                    {t('settings.scrobbling.nowPlaying')}
                                </Text>
                                <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                                    {t('settings.scrobbling.nowPlayingDescription')}
                                </Text>
                            </View>
                            <Switch
                                value={serverNowPlayingEnabled}
                                onValueChange={v => { dispatch(setServerNowPlayingEnabled(v)) }}
                                trackColor={{ true: themeColor }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                )}
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
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
    },
    sectionDark: { backgroundColor: '#111' },
    divider: {
        height: StyleSheet.hairlineWidth,
        width: '92%',
        backgroundColor: '#D1D1D6',
        alignSelf: 'center',
    },
    dividerDark: { backgroundColor: '#333' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 16,
    },
    rowLeft: { flex: 1 },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    rowSubtext: { fontSize: 13, color: '#6E6E73', marginTop: 2 },
    rowSubtextDark: { color: '#aaa' },
    rowValue: {
        fontSize: 15,
        color: '#888',
        flexShrink: 1,
        textAlign: 'right',
    },
    rowValueDark: { color: '#666' },
    iconSlot: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
