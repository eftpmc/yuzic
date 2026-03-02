import React from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
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
import { useTheme } from '@/hooks/useTheme';

export default function Settings() {
    const { t } = useTranslation();
    const router = useRouter();
    const activeServer = useSelector(selectActiveServer);
    const themeColor = useSelector(selectThemeColor);

    const { isDarkMode } = useTheme();
    const appVersion = Constants.expoConfig?.version ?? '—';

    if (!activeServer) {
        return null;
    }

    const { type, username, serverUrl } = activeServer;
    const avatarLetter = username?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={isDarkMode ? '#fff' : '#1C1C1E'}
                    />
                </TouchableOpacity>

                <View pointerEvents="none" style={styles.headerTitleWrapper}>
                    <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                        {t('settings.title')}
                    </Text>
                </View>

                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.profileCard, isDarkMode && styles.profileCardDark]}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: themeColor }]}>
                            <Text style={styles.avatarText}>{avatarLetter}</Text>
                        </View>
                        <View>
                            <Text style={[styles.profileName, isDarkMode && styles.profileNameDark]}>
                                {username || t('settings.profile.unknownUser')}
                            </Text>
                            <Text
                                style={[
                                    styles.profileSubtext,
                                    isDarkMode && styles.profileSubtextDark,
                                ]}
                            >
                                {t('settings.profile.connectedTo', { type, server: serverUrl?.replace(/^https?:\/\//, '') || t('settings.profile.noServer') })}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                    {t('settings.sections.general')}
                </Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    {renderRow(t('settings.rows.server'), 'drive', '/settings/serverView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.library'), 'book', '/settings/libraryView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.player'), 'controller-play', '/settings/playerView')}
                    {renderDivider()}
                    {renderRow(t('settings.rows.appearance'), 'brush', '/settings/appearanceView')}
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                    {t('settings.sections.plugins')}
                </Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/downloadersView')}
                    >
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            {t('settings.rows.downloaders')}
                        </Text>
                        <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={isDarkMode ? '#fff' : '#6E6E73'}
                        />
                    </TouchableOpacity>
                    {renderDivider()}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/listenbrainzView')}
                    >
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            {t('settings.rows.listenBrainz')}
                        </Text>
                        <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={isDarkMode ? '#fff' : '#6E6E73'}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                    {t('settings.sections.about')}
                </Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    {renderLinkRow(t('settings.rows.github'), 'https://github.com/eftpmc/yuzic')}
                    {renderDivider()}
                    {renderLinkRow(t('settings.rows.privacyPolicy'), 'https://eftpmc.github.io/yuzic-web/privacypolicy/')}
                    {renderDivider()}
                    {renderLinkRow(t('settings.rows.termsOfUse'), 'https://eftpmc.github.io/yuzic-web/tos/')}
                    {renderDivider()}
                    {renderStaticRow(t('settings.rows.version'), appVersion)}
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    function renderRow(label: string, icon: any, route: string) {
        return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(route)}>
                <View style={styles.leftContent}>
                    <Entypo
                        name={icon}
                        size={20}
                        color={isDarkMode ? '#fff' : '#6E6E73'}
                        style={styles.icon}
                    />
                    <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                        {label}
                    </Text>
                </View>
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={isDarkMode ? '#fff' : '#6E6E73'}
                />
            </TouchableOpacity>
        );
    }

    function renderLinkRow(label: string, url: string) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                    const supported = await Linking.canOpenURL(url);
                    supported ? Linking.openURL(url) : Alert.alert(t('settings.links.cantOpen', { url }));
                }}
            >
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                    {label}
                </Text>
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={isDarkMode ? '#fff' : '#6E6E73'}
                />
            </TouchableOpacity>
        );
    }

    function renderStaticRow(label: string, value: string) {
        return (
            <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                    {label}
                </Text>
                <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                    {value}
                </Text>
            </View>
        );
    }

    function renderDivider() {
        return <View style={[styles.divider, isDarkMode && styles.dividerDark]} />;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    containerDark: {
        backgroundColor: '#000',
    },

    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F2F2F7',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#D1D1D6',
    },
    headerContainerDark: {
        backgroundColor: '#000',
        borderBottomColor: '#1C1C1E',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    headerTitleDark: {
        color: '#fff',
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 24,
        paddingBottom: 150,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 16,
        marginLeft: 4,
        color: '#6E6E73',
    },
    sectionTitleDark: {
        color: '#aaa',
    },

    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    sectionDark: {
        backgroundColor: '#1C1C1E',
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
    },
    icon: {
        marginRight: 12,
    },
    rowText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    rowTextDark: {
        color: '#fff',
    },
    rowSubtext: {
        fontSize: 15,
        color: '#6E6E73',
    },
    rowSubtextDark: {
        color: '#aaa',
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        width: '92%',
        backgroundColor: '#D1D1D6',
        alignSelf: 'center',
    },
    dividerDark: {
        backgroundColor: '#2C2C2E',
    },

    profileCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    profileCardDark: {
        backgroundColor: '#1C1C1E',
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
        color: '#1C1C1E',
    },
    profileNameDark: {
        color: '#fff',
    },
    profileSubtext: {
        fontSize: 12,
        color: '#6E6E73',
    },
    profileSubtextDark: {
        color: '#aaa',
    },
});