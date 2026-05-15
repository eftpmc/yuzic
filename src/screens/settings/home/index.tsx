import React from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Entypo, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import {
    selectLidarrAuthenticated,
    selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import { selectLastFmAuthenticated } from '@/utils/redux/selectors/lastfmSelectors';
import { selectAnyDeezerEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

export default function Settings() {
    const { t } = useTranslation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);
    const themeColor = useSelector(selectThemeColor);
    const isLidarrConnected = useSelector(selectLidarrAuthenticated);
    const isSlskdConnected = useSelector(selectSlskdAuthenticated);
    const isLbConnected = useSelector(selectListenBrainzAuthenticated);
    const isLfmConnected = useSelector(selectLastFmAuthenticated);
    const isDeezerEnabled = useSelector(selectAnyDeezerEnabled);

    const { isDarkMode, colors } = useTheme();
    const appVersion = Constants.expoConfig?.version ?? '—';

    if (!activeServer) {
        return null;
    }

    const { type, username, serverUrl } = activeServer;
    const avatarLetter = username?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={colors.text}
                    />
                </TouchableOpacity>

                <View pointerEvents="none" style={styles.headerTitleWrapper}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {t('settings.title')}
                    </Text>
                </View>

                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: themeColor }]}>
                            <Text style={styles.avatarText}>{avatarLetter}</Text>
                        </View>
                        <View>
                            <Text style={[styles.profileName, { color: colors.text }]}>
                                {username || t('settings.profile.unknownUser')}
                            </Text>
                            <Text
                                style={[styles.profileSubtext, { color: colors.subtext }]}
                            >
                                {t('settings.profile.connectedTo', { type, server: serverUrl?.replace(/^https?:\/\//, '') || t('settings.profile.noServer') })}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.general')}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderRow(t('settings.rows.server'), 'drive', '/settings/serverView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.library'), 'book', '/settings/libraryView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.player'), 'controller-play', '/settings/playerView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.appearance'), 'brush', '/settings/appearanceView')}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.integrations')}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderStatusRow('Deezer', '/settings/deezerView', isDeezerEnabled ? t('settings.integrations.enabled') : t('settings.integrations.disabled'))}
                    {renderDivider()}
                    {renderStatusRow('Last.fm', '/settings/lastfmView', isLfmConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected'))}
                    {renderDivider()}
                    {renderStatusRow('ListenBrainz', '/settings/listenbrainzView', isLbConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected'))}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.downloaders')}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/lidarrView')}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, { color: colors.text }]}>
                                {t('settings.downloaders.lidarr.title')}
                            </Text>
                        </View>
                        <View style={styles.rowRight}>
                            <Text style={[styles.rowSubtext, { color: colors.subtext }]}>
                                {isLidarrConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                            </Text>
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={colors.subtext}
                            />
                        </View>
                    </TouchableOpacity>
                    {renderDivider()}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/slskdView')}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, { color: colors.text }]}>
                                {t('settings.downloaders.slskd.title')}
                            </Text>
                        </View>
                        <View style={styles.rowRight}>
                            <Text style={[styles.rowSubtext, { color: colors.subtext }]}>
                                {isSlskdConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                            </Text>
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={colors.subtext}
                            />
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.about')}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderLinkRow(t('settings.rows.github'), 'https://github.com/eftpmc/yuzic')}
                    {renderDivider()}
                    {renderLinkRow(t('settings.rows.privacyPolicy'), 'https://eftpmc.github.io/yuzic-web/privacypolicy/')}
                    {renderDivider()}
                    {renderLinkRow(t('settings.rows.termsOfUse'), 'https://eftpmc.github.io/yuzic-web/tos/')}
                </View>

                <Text style={[styles.versionText, { color: colors.subtext }]}>
                    Yuzic {appVersion}
                </Text>
            </ScrollView>
        </SafeAreaView>
    );

    function renderRow(label: string, icon: any, route: string) {
        return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(route as any)}>
                <View style={styles.leftContent}>
                    <Entypo
                        name={icon}
                        size={20}
                        color={colors.subtext}
                        style={styles.icon}
                    />
                    <Text style={[styles.rowText, { color: colors.text }]}>
                        {label}
                    </Text>
                </View>
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.subtext}
                />
            </TouchableOpacity>
        );
    }

    function renderStatusRow(label: string, route: string, status: string) {
        return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(route as any)}>
                <View style={styles.leftContent}>
                    <Text style={[styles.rowText, { color: colors.text }]}>
                        {label}
                    </Text>
                </View>
                <View style={styles.rowRight}>
                    <Text style={[styles.rowSubtext, { color: colors.subtext }]}>
                        {status}
                    </Text>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={colors.subtext}
                    />
                </View>
            </TouchableOpacity>
        );
    }

    function renderLinkRow(label: string, url: string) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                    const supported = await Linking.canOpenURL(url);
                    if (supported) {
                        await Linking.openURL(url);
                    } else {
                        Alert.alert(t('settings.links.cantOpen', { url }));
                    }
                }}
            >
                <Text style={[styles.rowText, { color: colors.text }]}>
                    {label}
                </Text>
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.subtext}
                />
            </TouchableOpacity>
        );
    }

    function renderDivider() {
        return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 24,
        paddingBottom: 120,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 16,
        marginLeft: 4,
    },

    section: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    headerTitleWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    icon: {
        marginRight: 12,
    },
    rowText: {
        fontSize: 16,
    },
    rowSubtext: {
        fontSize: 15,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        width: '92%',
        alignSelf: 'center',
    },

    profileCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
    },
    profileSubtext: {
        fontSize: 12,
    },

    versionText: {
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 60,
        fontSize: 13,
    },
});
