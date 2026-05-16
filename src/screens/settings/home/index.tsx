import React from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
    selectLidarrAuthenticated,
    selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import { selectLastFmAuthenticated } from '@/utils/redux/selectors/lastfmSelectors';
import { selectAnyDeezerEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import Header from '../components/Header';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';

export default function Settings() {
    const { t } = useTranslation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);
    const isLidarrConnected = useSelector(selectLidarrAuthenticated);
    const isSlskdConnected = useSelector(selectSlskdAuthenticated);
    const isLbConnected = useSelector(selectListenBrainzAuthenticated);
    const isLfmConnected = useSelector(selectLastFmAuthenticated);
    const isDeezerEnabled = useSelector(selectAnyDeezerEnabled);

    const { colors } = useTheme();
    const appVersion = Constants.expoConfig?.version ?? '—';

    if (!activeServer) return null;

    const { type, username, serverUrl } = activeServer;
    const avatarLetter = username?.[0]?.toUpperCase() || 'U';

    const openLink = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert(t('settings.links.cantOpen', { url }));
        }
    };

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <Header title={t('settings.title')} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <SettingsCard style={styles.profileCard}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: colors.themeColor }]}>
                            <Text style={styles.avatarText}>{avatarLetter}</Text>
                        </View>
                        <View>
                            <Text style={[styles.profileName, { color: colors.text }]}>
                                {username || t('settings.profile.unknownUser')}
                            </Text>
                            <Text style={[styles.profileSubtext, { color: colors.subtext }]}>
                                {t('settings.profile.connectedTo', { type, server: serverUrl?.replace(/^https?:\/\//, '') || t('settings.profile.noServer') })}
                            </Text>
                        </View>
                    </View>
                </SettingsCard>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.general')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.server')}
                        leftIcon={<Entypo name="drive" size={20} color={colors.subtext} />}
                        onPress={() => router.push('/settings/serverView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.library')}
                        leftIcon={<Entypo name="book" size={20} color={colors.subtext} />}
                        onPress={() => router.push('/settings/libraryView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.player')}
                        leftIcon={<Entypo name="controller-play" size={20} color={colors.subtext} />}
                        onPress={() => router.push('/settings/playerView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.appearance')}
                        leftIcon={<Entypo name="brush" size={20} color={colors.subtext} />}
                        onPress={() => router.push('/settings/appearanceView')}
                    />
                </SettingsCard>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.integrations')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label="Deezer"
                        rightText={isDeezerEnabled ? t('settings.integrations.enabled') : t('settings.integrations.disabled')}
                        onPress={() => router.push('/settings/deezerView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label="Last.fm"
                        rightText={isLfmConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                        onPress={() => router.push('/settings/lastfmView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label="ListenBrainz"
                        rightText={isLbConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                        onPress={() => router.push('/settings/listenbrainzView')}
                    />
                </SettingsCard>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.downloaders')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.downloaders.lidarr.title')}
                        rightText={isLidarrConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                        onPress={() => router.push('/settings/lidarrView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.downloaders.slskd.title')}
                        rightText={isSlskdConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                        onPress={() => router.push('/settings/slskdView')}
                    />
                </SettingsCard>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.about')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.github')}
                        onPress={() => openLink('https://github.com/eftpmc/yuzic')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.privacyPolicy')}
                        onPress={() => openLink('https://eftpmc.github.io/yuzic-web/privacypolicy/')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.termsOfUse')}
                        onPress={() => openLink('https://eftpmc.github.io/yuzic-web/tos/')}
                    />
                </SettingsCard>

                <Text style={[styles.versionText, { color: colors.subtext }]}>
                    Yuzic {appVersion}
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    profileCard: {
        padding: 16,
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
    profileSubtext: { fontSize: 12 },
    versionText: {
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 60,
        fontSize: 13,
    },
});
