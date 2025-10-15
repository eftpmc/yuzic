import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    FlatList,
    StyleSheet,
    Appearance,
    Pressable,
    Animated,
    Easing,
} from 'react-native';
import { useLidarr } from '@/contexts/LidarrContext';
import { useRouter } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

const LidarrSettingsView: React.FC = () => {
    const { serverUrl, apiKey, isAuthenticated, setServerUrl, setApiKey, pingServer, disconnect, queue, startQueuePolling, stopQueuePolling } = useLidarr();
    const { themeColor } = useSettings();
    const router = useRouter();
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const [isLoading, setIsLoading] = useState(false);
    const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
    const [loadingQueue, setLoadingQueue] = useState(true);

    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startQueuePolling();
        setLoadingQueue(true);
        const timeout = setTimeout(() => setLoadingQueue(false), 1500);
        return () => {
            stopQueuePolling();
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handlePing = async () => {
        setIsLoading(true);
        try {
            await pingServer();
            toast.success('Lidarr connection successful.');
        } catch {
            toast.error('Failed to connect.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        disconnect();
        toast('Disconnected from Lidarr.');
    };

    const toggleExpand = (id: number) => {
        setExpandedItemId(expandedItemId === id ? null : id);
    };

    const renderDownloadItem = ({ item }) => {
        const totalSize = item.size || 1;
        const sizeLeft = item.sizeleft || 0;
        const progress = Math.min(1, (totalSize - sizeLeft) / totalSize);
        const percent = Math.round(progress * 100);

        const hasWarnings = item.statusMessages?.length > 0;
        const isExpanded = expandedItemId === item.id;
        const downloadState = item.trackedDownloadState || item.status || 'unknown';

        return (
            <View style={styles.itemContainer}>
                <Pressable onPress={() => hasWarnings && toggleExpand(item.id)}>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.albumTitle, isDarkMode && styles.albumTitleDark]}>
                            {item.album?.title || item.title || 'Unknown Album'}
                        </Text>
                        <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
                            {item.artist?.artistName || item.artistName || 'Unknown Artist'}
                        </Text>

                        <Text style={[styles.status, isDarkMode && styles.statusDark]}>
                            {downloadState === 'importFailed' ? 'Import Failed' : `Status: ${downloadState}`} ({percent}%)
                        </Text>

                        <View style={[styles.progressBarBackground, isDarkMode && styles.progressBarBackgroundDark]}>
                            <View style={[styles.progressBarFill, { backgroundColor: themeColor, width: `${percent}%` }]} />
                        </View>

                        {hasWarnings && isExpanded && (
                            <View style={[styles.warningContainer, isDarkMode && styles.warningContainerDark]}>
                                {item.statusMessages.map((msg, idx) => (
                                    <View key={idx} style={styles.warningItem}>
                                        <Text style={[styles.warningTitle, isDarkMode && styles.warningTitleDark]}>
                                            {msg.title}
                                        </Text>
                                        {msg.messages?.map((m, i) => (
                                            <Text key={i} style={[styles.warningMessage, isDarkMode && styles.warningMessageDark]}>
                                                • {m}
                                            </Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </Pressable>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Lidarr
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Server Settings */}
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>Server URL</Text>
                    <TextInput
                        value={serverUrl}
                        onChangeText={setServerUrl}
                        placeholder="Enter Lidarr URL"
                        placeholderTextColor="#888"
                        style={[styles.input, isDarkMode && styles.inputDark]}
                    />

                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>API Key</Text>
                    <TextInput
                        value={apiKey}
                        onChangeText={setApiKey}
                        placeholder="Enter API Key"
                        placeholderTextColor="#888"
                        secureTextEntry
                        style={[styles.input, isDarkMode && styles.inputDark]}
                    />

                    <TouchableOpacity style={styles.row} onPress={handlePing}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>Connectivity</Text>
                        {isLoading ? (
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Loader2 size={20} color={themeColor} />
                            </Animated.View>
                        ) : (
                            <MaterialIcons
                                name={isAuthenticated ? 'check-circle' : 'cancel'}
                                size={20}
                                color={isAuthenticated ? 'green' : 'red'}
                            />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Downloads List */}
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>Queue</Text>

                    {loadingQueue ? (
                        <View style={{ marginTop: 20, alignItems: 'center', justifyContent: 'center' }}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Loader2 size={32} color={isDarkMode ? '#fff' : '#000'} />
                            </Animated.View>
                        </View>
                    ) : queue.length === 0 ? (
                        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                            Nothing downloading yet. Albums will show up here once started!
                        </Text>
                    ) : (
                        <FlatList
                            data={queue}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderDownloadItem}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                {/* Disconnect */}
                <TouchableOpacity
                    style={[styles.disconnectButton, isDarkMode && styles.disconnectButtonDark]}
                    onPress={handleDisconnect}
                >
                    <MaterialIcons name="logout" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default LidarrSettingsView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
    headerDark: { backgroundColor: '#000', borderBottomColor: '#222' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'center' },
    headerTitleDark: { color: '#fff' },
    backButton: {
        position: 'absolute',
        left: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { marginBottom: 24 },
    sectionDark: { backgroundColor: '#111', padding: 16, borderRadius: 10 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
    labelDark: { color: '#fff' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        color: '#000',
        backgroundColor: '#fff',
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
        marginTop: 12,
    },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    emptyText: { textAlign: 'center', marginVertical: 16, fontSize: 16, color: '#666' },
    emptyTextDark: { color: '#aaa' },
    itemContainer: { padding: 16, borderRadius: 10, marginBottom: 12 },
    itemInfo: { flexDirection: 'column' },
    albumTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
    albumTitleDark: { color: '#fff' },
    artistName: { fontSize: 14, color: '#666', marginTop: 4 },
    artistNameDark: { color: '#aaa' },
    status: { fontSize: 12, color: '#888', marginTop: 6 },
    statusDark: { color: '#888' },
    progressBarBackground: {
        height: 6,
        width: '100%',
        backgroundColor: '#ddd',
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressBarBackgroundDark: { backgroundColor: '#333' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    warningContainer: { marginTop: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 6 },
    warningContainerDark: { backgroundColor: '#1a1a1a' },
    warningItem: { marginBottom: 6 },
    warningTitle: { fontSize: 13, fontWeight: '600', color: '#555' },
    warningTitleDark: { color: '#ccc' },
    warningMessage: { fontSize: 12, color: '#777', marginLeft: 8, marginTop: 2 },
    warningMessageDark: { color: '#aaa' },
    disconnectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF3B30',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 16,
    },
    disconnectButtonDark: {
        backgroundColor: '#FF453A',
    },
    disconnectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});