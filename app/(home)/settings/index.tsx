import React, { useState, useEffect } from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Switch,
    Linking,
    Alert
} from 'react-native';
import { useLidarr } from '@/contexts/LidarrContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServer } from '@/contexts/ServerContext'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import { Ionicons, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const router = useRouter();
    const { isAuthenticated } = useLidarr();
    const { serverType, username, serverUrl } = useServer()
    const { themeColor, lidarrEnabled, setLidarrEnabled } = useSettings();
    const [tempLidarrEnabled, setTempLidarrEnabled] = useState(lidarrEnabled);
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';

    useEffect(() => {
        setLidarrEnabled(tempLidarrEnabled);
    }, [tempLidarrEnabled]);

    const avatarLetter = username?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Settings
                </Text>

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
                                {username || 'Unknown User'}
                            </Text>
                            <Text style={[styles.profileSubtext, isDarkMode && styles.profileSubtextDark]}>
                                Connected to {serverType} at {serverUrl?.replace(/^https?:\/\//, '') || 'no server'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>General</Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    {renderRow('Server', 'drive', '/settings/serverView')}
                    {renderDivider()}
                    {renderRow('Library', 'book', '/settings/libraryView')}
                    {renderDivider()}
                    {renderRow('Player', 'controller-play', '/settings/playerView')}
                    {renderDivider()}
                    {renderRow('Appearance', 'brush', '/settings/appearanceView')}
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>Plugins</Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/lidarrView')}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                Lidarr
                            </Text>
                        </View>
                        <Switch
                            value={tempLidarrEnabled}
                            onValueChange={setTempLidarrEnabled}
                            disabled={!isAuthenticated}
                            trackColor={{ false: '#999', true: themeColor }}
                            thumbColor={isDarkMode ? '#fff' : '#fff'}
                            onStartShouldSetResponder={() => true} // Prevents row tap from interfering
                        />
                    </TouchableOpacity>
                    {renderDivider()}
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/openaiView')}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                OpenAI
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? '#fff' : '#333'} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>About</Text>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={async () => {
                            const url = "https://pastebin.com/raw/KzGjR9aA"
                            const supported = await Linking.canOpenURL(url);

                            if (supported) {
                                await Linking.openURL(url);
                            } else {
                                Alert.alert(`Don't know how to open this URL: ${url}`);
                            }
                        }}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                Privacy Policy
                            </Text>
                        </View>

                        <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? '#fff' : '#333'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={async () => {
                            const url = "https://pastebin.com/raw/4QHJPtuj"
                            const supported = await Linking.canOpenURL(url);

                            if (supported) {
                                await Linking.openURL(url);
                            } else {
                                Alert.alert(`Don't know how to open this URL: ${url}`);
                            }
                        }}
                    >
                        <View style={styles.leftContent}>
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                Terms of Use
                            </Text>
                        </View>

                        <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? '#fff' : '#333'} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    function renderRow(label: string, icon: any, route: string) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(route)}
            >
                <View style={styles.leftContent}>
                    <Entypo
                        name={icon}
                        size={20}
                        color={isDarkMode ? '#fff' : '#333'}
                        style={styles.icon}
                    />
                    <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>{label}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
        );
    }

    function renderDivider() {
        return <View style={styles.divider} />;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginBottom: 150
    },
    containerDark: {
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 8,
        paddingBottom: 12,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    headerTitleDark: {
        color: '#fff',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 16,
        marginLeft: 4,
        color: '#333',
    },
    sectionTitleDark: {
        color: '#aaa',
    },
    section: {
        marginVertical: 8,
        backgroundColor: '#f2f2f2',
        borderRadius: 10,
        overflow: 'hidden',
    },
    sectionDark: {
        backgroundColor: '#1C1C1E',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    toggleRow: {
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
        color: '#333',
    },
    rowTextDark: {
        color: '#fff',
    },
    divider: {
        height: 1,
        width: '92%',
        backgroundColor: '#222',
        alignSelf: 'center',
    },
    profileCard: {
        marginBottom: 10,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    profileCardDark: {
        backgroundColor: '#1C1C1E',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center', // ✅ Vertical centering
        height: 52, // ✅ Or however tall you want the profile row
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ccc',
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
        color: '#000',
    },
    profileNameDark: {
        color: '#fff',
    },
    profileSubtext: {
        fontSize: 12,
        color: '#444',
    },
    profileSubtextDark: {
        color: '#aaa',
    }
});