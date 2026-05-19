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
import { Server, Library, Volume2, Palette, Puzzle, Download, Github, ShieldCheck, ScrollText } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import Header from '../components/Header';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';

export default function Settings() {
    const { t } = useTranslation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);

    const { colors } = useTheme();
    const appVersion = Constants.expoConfig?.version ?? '—';

    if (!activeServer) return null;

    const { type, username, serverUrl } = activeServer;
    const avatarLetter = username?.[0]?.toUpperCase() || 'U';
    const cleanUrl = serverUrl?.replace(/^https?:\/\//, '') || t('settings.profile.noServer');

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
                {/* Profile Card */}
                <SettingsCard style={styles.profileCard}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: colors.themeColor }]}>
                            <Text style={styles.avatarText}>{avatarLetter}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: colors.secondary }]}>
                                {username || t('settings.profile.unknownUser')}
                            </Text>
                            <View style={styles.serverMeta}>
                                <View style={[styles.typeBadge, { backgroundColor: colors.muted }]}>
                                    <Text style={[styles.typeBadgeText, { color: colors.subtext }]}>
                                        {type}
                                    </Text>
                                </View>
                                <Text style={[styles.serverUrl, { color: colors.subtext }]} numberOfLines={1}>
                                    {cleanUrl}
                                </Text>
                            </View>
                        </View>
                    </View>
                </SettingsCard>

                {/* General */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.general')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.server')}
                        leftIcon={<Server size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/serverView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.library')}
                        leftIcon={<Library size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/libraryView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.player')}
                        leftIcon={<Volume2 size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/playerView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.appearance')}
                        leftIcon={<Palette size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/appearanceView')}
                    />
                </SettingsCard>

                <SettingsCard>
                    <SettingsRow
                        label={t('settings.sections.integrations')}
                        leftIcon={<Puzzle size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/integrationsView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.downloaders.title')}
                        leftIcon={<Download size={22} color={colors.secondary} />}
                        onPress={() => router.push('/settings/downloadersView')}
                    />
                </SettingsCard>

                {/* About */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.about')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.github')}
                        leftIcon={<Github size={22} color={colors.secondary} />}
                        onPress={() => openLink('https://github.com/eftpmc/yuzic')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.privacyPolicy')}
                        leftIcon={<ShieldCheck size={22} color={colors.secondary} />}
                        onPress={() => openLink('https://eftpmc.github.io/yuzic-web/privacypolicy/')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.termsOfUse')}
                        leftIcon={<ScrollText size={22} color={colors.secondary} />}
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
        paddingVertical: 16,
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
        marginBottom: 12,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    serverMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    serverUrl: {
        fontSize: 12,
        flex: 1,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 32,
        marginBottom: 60,
        fontSize: 13,
    },
});
