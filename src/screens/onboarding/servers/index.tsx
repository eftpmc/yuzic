import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    FlatList,
    Alert,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import {
    setActiveServer,
    removeServer,
} from '@/utils/redux/slices/serversSlice';
import { AntDesign } from '@expo/vector-icons';
import { MenuView } from '@react-native-menu/menu';

import { SERVER_PROVIDERS } from '@/utils/servers/registry';
import { track } from '@/utils/analytics/amplitude';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { Server } from '@/types';

export default function Servers() {
    const router = useRouter();
    const dispatch = useDispatch();

    const servers = useSelector((state: RootState) => state.servers.servers);
    const activeServerId = useSelector(
        (state: RootState) => state.servers.activeServerId
    );

    const handleSelectServer = (id: string) => {
        track("selected server")
        dispatch(setActiveServer(id));
        router.push('(home)');
    };

    const handleAddServer = () => {
        router.push('/(onboarding)/connect');
    };

    const confirmDelete = (id: string, serverUrl: string) => {
        Alert.alert(
            'Delete Server',
            `Remove ${serverUrl.replace(/^https?:\/\//, '')}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => dispatch(removeServer(id)),
                },
            ]
        );
    };

    const renderServer = ({ item }: { item: Server }) => {
        const isActive = item.id === activeServerId;
        const icon = SERVER_PROVIDERS[item.type]?.icon;

        return (
            <View style={styles.serverCard}>
                <TouchableOpacity
                    style={styles.serverInfo}
                    onPress={() => handleSelectServer(item.id)}
                    activeOpacity={0.75}
                >
                    <Image
                        source={icon}
                        style={styles.serverIcon}
                        resizeMode="contain"
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
                                <View style={styles.activeBadge}>
                                    <Text style={styles.activeBadgeText}>
                                        ACTIVE
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                <MenuView
                    onPressAction={({ nativeEvent }) => {
                        if (nativeEvent.event === 'delete') {
                            confirmDelete(item.id, item.serverUrl);
                        }
                    }}
                    actions={[
                        {
                            id: 'delete',
                            title: 'Delete',
                            attributes: {
                                destructive: true,
                            },
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.menuButton}
                        hitSlop={10}
                    >
                        <AntDesign name="ellipsis1" size={18} color="#888" />
                    </TouchableOpacity>
                </MenuView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Your Servers</Text>
                <Text style={styles.subtitle}>
                    Choose a server to continue or add a new one.
                </Text>

                <FlatList
                    data={servers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderServer}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No servers added yet.
                        </Text>
                    }
                    contentContainerStyle={{
                        paddingTop: 20,
                        paddingBottom: 20,
                    }}
                />
            </View>

            <View style={styles.bottomContent}>
                <TouchableOpacity
                    style={[
                        styles.addButton,
                    ]}
                    activeOpacity={0.85}
                    onPress={handleAddServer}
                >
                    <Text style={styles.addButtonText}>Add Server</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        paddingTop: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
    },

    serverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 10,
    },

    serverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 12,
    },

    serverIcon: {
        width: 36,
        height: 36,
        marginRight: 12,
    },

    textContainer: {
        flex: 1,
    },

    serverName: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 4,
    },

    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    serverSubtext: {
        fontSize: 13,
        color: '#888',
    },

    activeBadge: {
        backgroundColor: '#1f6feb',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },

    activeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },

    menuButton: {
        padding: 6,
        borderRadius: 8,
    },

    emptyText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 40,
        fontSize: 14,
    },

    bottomContent: {
        marginBottom: Platform.OS === 'ios' ? 40 : 20,
    },

    addButton: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },

    addButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
});