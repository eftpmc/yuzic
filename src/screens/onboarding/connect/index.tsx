import React, { useState, useEffect } from 'react';
import {
    Image,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@backpackapp-io/react-native-toast';
import { nanoid } from '@reduxjs/toolkit';
import { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { track } from '@/utils/analytics/amplitude';
import { useDispatch } from 'react-redux';
import { ServerType } from '@/types';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';

export default function Connect() {
    const [localServerUrl, setLocalServerUrl] = useState('');
    const [selectedType, setSelectedType] = useState<ServerType | null>(null);
    const [isLayoutMounted, setIsLayoutMounted] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        const t = setTimeout(() => setIsLayoutMounted(true), 0);
        return () => clearTimeout(t);
    }, []);

    const handleNext = async () => {
        if (!selectedType) {
            toast.error('Select a server type first.');
            return;
        }

        if (!localServerUrl) {
            toast.error('Please enter a valid server URL.');
            return;
        }

        const provider = SERVER_PROVIDERS[selectedType];

        setIsTesting(true);
        try {
            const result = await provider.testServerUrl(localServerUrl);

            if (!result.success) {
                toast.error(result.message ?? 'Server could not be reached.');
                return;
            }

            router.push({
                pathname: '(onboarding)/credentials',
                params: {
                    type: selectedType,
                    serverUrl: localServerUrl,
                },
            });
        } catch {
            toast.error('Failed to connect.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleDemo = async () => {
        if (!selectedType) return;

        const provider = SERVER_PROVIDERS[selectedType];

        if (!provider.capabilities.supportsDemo || !provider.demo) {
            toast.error('Demo unavailable for this provider.');
            return;
        }

        setIsTesting(true);
        try {
            const demo = await provider.demo();
            const id = nanoid();

            dispatch(
                addServer({
                    id,
                    type: selectedType,
                    serverUrl: demo.serverUrl,
                    username: demo.username,
                    auth: demo.auth,
                    isAuthenticated: true,
                })
            );

            track('connected new server', { type: selectedType, demo: true });
            dispatch(setActiveServer(id));
            router.replace('/(home)');
        } catch {
            toast.error('An error occurred while connecting.');
        } finally {
            setIsTesting(false);
        }
    };

    if (!isLayoutMounted) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#555" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flex: 1 }}>
                <View style={styles.mainContent}>
                    <Text style={styles.title}>Connect to your Server</Text>
                    <Text style={styles.subtitle}>Enter your server URL (http/https)</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="https://your-server.example.com"
                        placeholderTextColor="#888"
                        value={localServerUrl}
                        onChangeText={setLocalServerUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        keyboardType="url"
                        returnKeyType="next"
                        onSubmitEditing={handleNext}
                    />

                    <View style={styles.serverTypeContainer}>
                        {Object.values(SERVER_PROVIDERS).map((provider) => {
                            const isSelected = selectedType === provider.type;

                            return (
                                <TouchableOpacity
                                    key={provider.type}
                                    onPress={() => setSelectedType(provider.type)}
                                    style={[
                                        styles.serverTypeButton,
                                        isSelected && styles.serverTypeButtonSelected,
                                    ]}
                                >
                                    <Image
                                        source={provider.icon}
                                        style={{ width: 36, height: 36, marginBottom: 6 }}
                                        resizeMode="contain"
                                    />
                                    <Text
                                        style={[
                                            styles.serverTypeText,
                                            isSelected && styles.serverTypeTextSelected,
                                        ]}
                                    >
                                        {provider.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {selectedType && (
                        <Text style={styles.description}>
                            {SERVER_PROVIDERS[selectedType].description}
                        </Text>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.nextButton, isTesting && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={isTesting}
                    >
                        {isTesting ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Text style={styles.nextButtonText}>Next</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.demoButton,
                            (!selectedType ||
                                !SERVER_PROVIDERS[selectedType].capabilities.supportsDemo ||
                                isTesting) &&
                                styles.nextButtonDisabled,
                        ]}
                        onPress={handleDemo}
                        disabled={
                            !selectedType ||
                            !SERVER_PROVIDERS[selectedType].capabilities.supportsDemo ||
                            isTesting
                        }
                    >
                        <Text style={styles.demoButtonText}>
                            {selectedType &&
                            SERVER_PROVIDERS[selectedType].capabilities.supportsDemo
                                ? `Use ${SERVER_PROVIDERS[selectedType].label} demo`
                                : 'Demo unavailable'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        marginTop: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginBottom: 20,
    },
    description: {
        color: '#aaa',
        marginBottom: 20,
        marginTop: 8,
    },
    serverTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    serverTypeButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#555',
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    serverTypeButtonSelected: {
        borderColor: '#fff',
        backgroundColor: '#fff',
    },
    serverTypeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginTop: 6,
    },
    serverTypeTextSelected: {
        color: '#000',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#555',
        borderRadius: 8,
        paddingHorizontal: 12,
        color: '#fff',
        backgroundColor: '#222',
        marginBottom: 10,
    },
    buttonContainer: {
        padding: 20,
        backgroundColor: '#000',
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    nextButtonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        backgroundColor: '#333',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 4,
    },
    demoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});