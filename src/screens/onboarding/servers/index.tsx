import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import {
    setActiveServer,
    removeServer,
} from '@/utils/redux/slices/serversSlice';
import { clearOfflineMutationsForServer } from '@/utils/redux/slices/offlineMutationsSlice';
import { Ellipsis } from 'lucide-react-native';

import { SERVER_PROVIDERS } from '@/utils/servers/registry';
import { Server } from '@/types';
import { useTranslation } from 'react-i18next';
import Touchable from '@/components/Touchable';
import { spacing, typography, onDark } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export default function Servers() {
    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch();
    const rad = useRadius();

    const servers = useSelector((state: RootState) => state.servers.servers);
    const activeServerId = useSelector(
        (state: RootState) => state.servers.activeServerId
    );

    const handleSelectServer = (id: string) => {
        if (id === activeServerId) {
            dispatch(setActiveServer(id));
            router.replace('/(tabs)');
            return;
        }

        dispatch(setActiveServer(id));
        router.replace('/(tabs)');
    };

    const handleAddServer = () => {
        router.push('/(onboarding)/connect');
    };

    const confirmDelete = (id: string, serverUrl: string) => {
        Alert.alert(
            t('onboarding.servers.deleteTitle'),
            t('onboarding.servers.deleteBody', { server: serverUrl.replace(/^https?:\/\//, '') }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        // Otherwise these become permanently invisible and
                        // permanently un-retryable: PendingOfflineChanges only
                        // ever shows entries for the current activeServerId,
                        // which this server can never be again.
                        dispatch(clearOfflineMutationsForServer(id));
                        dispatch(removeServer(id));
                    },
                },
            ]
        );
    };

    const renderServer = ({ item }: { item: Server }) => {
        const isActive = item.id === activeServerId;
        const icon = SERVER_PROVIDERS[item.type]?.icon;

        return (
            <View style={[styles.serverCard, { borderRadius: rad.card }]}>
                <Touchable
                    style={styles.serverInfo}
                    onPress={() => handleSelectServer(item.id)}
                >
                    <Image
                        source={icon}
                        style={styles.serverIcon}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />

                    <View style={styles.textContainer}>
                        <Text style={styles.serverName}>
                            {item.serverUrl.replace(/^https?:\/\//, '')}
                        </Text>

                        <View style={styles.subRow}>
                            <Text style={styles.serverSubtext}>
                                {item.username}
                            </Text>

                            {isActive && (
                                <View style={[styles.activeBadge, { borderRadius: rad.pill }]}>
                                    <Text style={styles.activeBadgeText}>
                                        {t('onboarding.servers.active')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Touchable>

                <Touchable
                    style={[styles.menuButton, { borderRadius: rad.md }]}
                    hitSlop={10}
                    onPress={() => confirmDelete(item.id, item.serverUrl)}
                >
                    <Ellipsis size={18} color={onDark.mutedText} />
                </Touchable>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{t('onboarding.servers.title')}</Text>
                <Text style={styles.subtitle}>
                    {t('onboarding.servers.subtitle')}
                </Text>

                <FlatList
                    data={servers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderServer}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {t('onboarding.servers.empty')}
                        </Text>
                    }
                    contentContainerStyle={{
                        paddingTop: spacing.roomy,
                        paddingBottom: spacing.roomy,
                    }}
                />
            </View>

            <View style={styles.bottomContent}>
                <Touchable
                    style={[
                        styles.addButton,
                        { borderRadius: rad.pill },
                    ]}
                    onPress={handleAddServer}
                >
                    <Text style={styles.addButtonText}>{t('onboarding.servers.add')}</Text>
                </Touchable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: onDark.background,
        paddingHorizontal: spacing.roomy,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        paddingTop: spacing.xxl,
    },
    title: {
        ...typography.display,
        color: onDark.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: onDark.subtext,
    },

    serverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: onDark.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.controlGap,
    },

    serverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: spacing.md,
    },

    serverIcon: {
        width: 36,
        height: 36,
        marginRight: spacing.md,
    },

    textContainer: {
        flex: 1,
    },

    serverName: {
        ...typography.body,
        color: onDark.text,
        marginBottom: spacing.xs,
    },

    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    serverSubtext: {
        ...typography.caption,
        color: onDark.mutedText,
    },

    activeBadge: {
        backgroundColor: '#1f6feb',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
    },

    activeBadgeText: {
        ...typography.micro,
        fontWeight: '600',
        color: onDark.text,
    },

    menuButton: {
        padding: spacing.tight,
    },

    emptyText: {
        ...typography.rowSubtitle,
        textAlign: 'center',
        color: onDark.mutedText,
        marginTop: spacing.xxxl,
    },

    bottomContent: {
        marginBottom: Platform.OS === 'ios' ? 40 : 20,
    },

    addButton: {
        backgroundColor: onDark.text,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },

    addButtonText: {
        ...typography.sheetTitle,
        color: '#000',
    },
});
