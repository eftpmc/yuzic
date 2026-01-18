import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import Loader from '@/components/Loader';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

const ICON_SIZE = 20;

const ServerSettings: React.FC = () => {
    const { isDarkMode } = useTheme();
    const api = useApi();

    const activeServer = useSelector(selectActiveServer);

    if (!activeServer) {
        return null;
    }

    const { serverUrl, username, isAuthenticated } = activeServer;

    const [isLoading, setIsLoading] = useState(false);

    const handlePing = async () => {
        setIsLoading(true);
        try {
            if (!api) {
                alert('No API available.');
                return;
            }
            const ok = await api.auth.ping();
            alert(ok ? 'Server connection successful.' : 'Failed to connect.');
        } catch {
            alert('Failed to connect.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView
            style={[
                styles.container,
                isDarkMode && styles.containerDark,
                Platform.OS === 'android' && { paddingTop: 24 },
            ]}
        >
            <Header title="Server" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                        Server URL
                    </Text>
                    <TextInput
                        numberOfLines={1}
                        value={serverUrl || ''}
                        editable={false}
                        placeholder="Not Set"
                        placeholderTextColor="#888"
                        style={[styles.input, isDarkMode && styles.inputDark]}
                    />

                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                        Username
                    </Text>
                    <TextInput
                        numberOfLines={1}
                        value={username || ''}
                        editable={false}
                        placeholder="Not Set"
                        placeholderTextColor="#888"
                        style={[styles.inputNoMargin, isDarkMode && styles.inputDark]}
                    />

                    <View style={{ height: 16 }} />

                    <TouchableOpacity style={styles.row} onPress={handlePing}>
                        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                            Connectivity
                        </Text>

                        <View style={styles.iconSlot}>
                            {isLoading ? (
                                <Loader />
                            ) : (
                                <MaterialIcons
                                    name={isAuthenticated ? 'check-circle' : 'cancel'}
                                    size={ICON_SIZE}
                                    color={isAuthenticated ? 'green' : 'red'}
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
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
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    sectionDark: {
        backgroundColor: '#111',
    },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
    labelDark: { color: '#fff' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    inputNoMargin: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 0,
        color: '#000',
        backgroundColor: '#f9f9f9',
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
        marginTop: 16,
    },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    iconSlot: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
});