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
import { Server, Library, Volume2, Palette, Puzzle, Download, CloudDownload, Github, ShieldCheck, ScrollText, House as HomeIcon } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useAnyDownloaderConnected } from '@/features/downloaders/registry';
import { useTheme } from '@/hooks/useTheme';
import Header from '../components/Header';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import Touchable from '@/components/Touchable';
import { cappedTypography, fontScaleCap, iconSize, radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export default function Settings() {
    const { t } = useTranslation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);
    // The queue screen has nothing to show without a downloader behind it —
    // the row led to "No downloaders connected. Add one in Settings", from
    // Settings, one row below the place that adds one.
    const hasDownloader = useAnyDownloaderConnected();

    const { colors } = useTheme();
    const rad = useRadius();
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
                {/*
                  The card repeats what the sheet you arrived from already
                  showed — the same avatar, name, badge and host. Rather than
                  drop it and lose the anchor at the top of the screen, it
                  opens Server: the one place where those four facts can
                  actually be changed. It draws text, so the row reads itself
                  and needs no label of its own.
                */}
                <Touchable
                    feedback="none"
                    accessibilityRole="button"
                    onPress={() => router.push('/settings/serverView')}
                >
                <SettingsCard style={styles.profileCard}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: colors.themeColor, borderRadius: rad.pill }]}>
                            <Text style={styles.avatarText} maxFontSizeMultiplier={fontScaleCap.glyph}>{avatarLetter}</Text>
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
                </Touchable>

                {/* General */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.general')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.server')}
                        leftIcon={<Server size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/serverView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        testID="settings-row-library"
                        label={t('settings.rows.library')}
                        leftIcon={<Library size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/libraryView')}
                    />
                    <SettingsDivider />
                    {/*
                      Home sits beside Library because it is the other surface
                      a listener spends time in, and because its settings —
                      which sources fill its shelves — used to be filed under
                      Appearance, where nobody would think to look for them.
                    */}
                    <SettingsRow
                        label={t('settings.home.title')}
                        leftIcon={<HomeIcon size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/homeView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.player')}
                        leftIcon={<Volume2 size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/playerView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.appearance')}
                        leftIcon={<Palette size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/appearanceView')}
                    />
                </SettingsCard>

                {/*
                  This card had no heading at all: "General" led the one above
                  it and "About" the one below, leaving Integrations and
                  Downloaders reading as either the tail of General or as
                  nothing. They are neither — they are the things Yuzic talks
                  to besides your server.
                */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.connections')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.sections.integrations')}
                        leftIcon={<Puzzle size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/integrationsView')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.downloaders.title')}
                        leftIcon={<Download size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => router.push('/settings/downloadersView')}
                    />
                    {hasDownloader && (
                        <>
                            <SettingsDivider />
                            <SettingsRow
                                label={t('downloads.title')}
                                leftIcon={<CloudDownload size={iconSize.secondary} color={colors.secondary} />}
                                onPress={() => router.push('/downloadsView')}
                            />
                        </>
                    )}
                </SettingsCard>

                {/* About */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {t('settings.sections.about')}
                </Text>
                <SettingsCard>
                    <SettingsRow
                        label={t('settings.rows.github')}
                        leftIcon={<Github size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => openLink('https://github.com/yuzicapp/yuzic')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.privacyPolicy')}
                        leftIcon={<ShieldCheck size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => openLink('https://yuzicapp.github.io/yuzic-web/privacypolicy/')}
                    />
                    <SettingsDivider />
                    <SettingsRow
                        label={t('settings.rows.termsOfUse')}
                        leftIcon={<ScrollText size={iconSize.secondary} color={colors.secondary} />}
                        onPress={() => openLink('https://yuzicapp.github.io/yuzic-web/tos/')}
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        paddingBottom: spacing.scrollClearance,
    },
    sectionTitle: {
        ...typography.label,
        marginBottom: spacing.tight,
        marginTop: spacing.lg,
        marginLeft: spacing.xs,
    },
    profileCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...cappedTypography.glyph.sectionTitle,
        fontWeight: '700',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        ...typography.rowTitle,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    serverMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeBadge: {
        paddingHorizontal: spacing.tight,
        paddingVertical: spacing.xxs,
        borderRadius: radius.xs,
    },
    typeBadgeText: {
        ...typography.micro,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    serverUrl: {
        ...typography.caption,
        flex: 1,
    },
    versionText: {
        ...typography.caption,
        textAlign: 'center',
        marginTop: spacing.xxl,
        marginBottom: spacing.headerOffset,
    },
});
