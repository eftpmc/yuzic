import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useServer } from '@/contexts/ServerContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setServerType } from '@/utils/redux/slices/serverSlice';
import { useDispatch } from 'react-redux';
import { Music, Film } from 'lucide-react-native';

export default function OnboardingScreen() {
    const [localServerUrl, setLocalServerUrl] = useState('');
    const [selectedType, setSelectedType] = useState<'navidrome' | 'jellyfin' | null>(null);
    const [isLayoutMounted, setIsLayoutMounted] = useState(false);
    const {
        isAuthenticated,
        setServerUrl,
        setUsername,
        setPassword,
        serverUrl,
        testServerUrl,
    } = useServer();
    const [isTesting, setIsTesting] = useState(false);
    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        const timeout = setTimeout(() => setIsLayoutMounted(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (isLayoutMounted && isAuthenticated) {
            router.replace('(home)');
        }
    }, [isAuthenticated, isLayoutMounted, router]);

    useEffect(() => {
        if (serverUrl) {
            setLocalServerUrl(serverUrl);
        }
    }, [serverUrl]);

    const handleNext = async () => {
        if (!localServerUrl) {
            Alert.alert('Error', 'Please enter a valid server URL.');
            return;
        }
        if (!selectedType) {
            Alert.alert('Select a server type first.');
            return;
        }

        setIsTesting(true);
        try {
            const result = await testServerUrl(localServerUrl);
            if (result.success) {
                setServerUrl(localServerUrl);
                router.push('(onboarding)/credentials');
            } else {
                Alert.alert('Error', 'Server could not be reached. Please verify the URL.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to connect.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleDemo = async () => {
        setIsTesting(true);
        try {
            setServerUrl('https://demo.navidrome.org');
            setUsername('demo');
            setPassword('demo');
            router.replace('(home)');
        } catch (e) {
            console.error('Failed to use demo server:', e);
            setIsTesting(false);
        }
    };

    if (!isLayoutMounted || isAuthenticated) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#555" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.title}>Connect to your Server</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    </View>
                    <View style={styles.serverTypeContainer}>
                        {(['navidrome', 'jellyfin'] as const).map((type) => {
                            const isSelected = selectedType === type;
                            const Icon = type === 'navidrome' ? Music : Film;

                            return (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => {
                                        // 1️⃣ update local UI immediately
                                        setSelectedType(type);

                                        // 2️⃣ defer provider swap to next frame
                                        requestAnimationFrame(() => {
                                            dispatch(setServerType(type));
                                        });
                                    }}
                                    style={[
                                        styles.serverTypeButton,
                                        isSelected && styles.serverTypeButtonSelected,
                                    ]}
                                >
                                    <Icon size={22} color={isSelected ? '#000' : '#fff'} />
                                    <Text style={[styles.serverTypeText, isSelected && styles.serverTypeTextSelected]}>
                                        {type === 'navidrome' ? 'Navidrome' : 'Jellyfin'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {selectedType && (
                        <Text style={{ color: '#aaa', marginBottom: 20, marginTop: 8 }}>
                            {selectedType === 'navidrome'
                                ? 'A lightweight, self-hosted music server.'
                                : 'A full-featured media server for music, movies, and TV.'}
                        </Text>
                    )}
                    <Text style={styles.subtitle}>Enter your server URL (http/https)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={
                            selectedType === 'jellyfin'
                                ? 'https://jellyfin.example.com'
                                : 'https://navidrome.example.com'
                        }
                        placeholderTextColor="#888"
                        value={localServerUrl}
                        onChangeText={(text) => setLocalServerUrl(text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        keyboardType="url"
                        returnKeyType="next"
                        onSubmitEditing={handleNext}
                    />

                </ScrollView>

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
                            (selectedType === 'jellyfin' || isTesting) && styles.nextButtonDisabled
                        ]}
                        onPress={handleDemo}
                        disabled={selectedType === 'jellyfin' || isTesting}
                    >
                        <Text style={styles.demoButtonText}>
                            {selectedType === 'jellyfin' ? 'Demo unavailable for Jellyfin' : 'Use Navidrome demo'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
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
    serverTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        backgroundColor: '#333', // soft gray tone
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 4, // optional slight spacing
    },
    demoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});