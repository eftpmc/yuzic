import React, { useState, useEffect } from 'react';
import {
    Image,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { testServerUrl as testNavidromeUrl } from '@/api/navidrome/auth/testServerUrl';
import { testServerUrl as testJellyfinUrl } from '@/api/jellyfin/auth/testServerUrl'
import NavidromeIcon from '@assets/images/navidrome.png';
import JellyfinIcon from '@assets/images/jellyfin.png';
import { toast } from '@backpackapp-io/react-native-toast';
import { nanoid } from '@reduxjs/toolkit';
import { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { track } from '@/utils/analytics/amplitude';
import { useDispatch } from 'react-redux';
import { connect } from '@/api/navidrome/auth/connect';
import { ServerType } from '@/types';

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

        setIsTesting(true);
        try {
            const result =
                selectedType === "navidrome"
                    ? await testNavidromeUrl(localServerUrl)
                    : await testJellyfinUrl(localServerUrl);

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
        } catch (e) {
            console.log(e);
            toast.error('Failed to connect.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleDemo = async () => {
        setIsTesting(true);
        try {
            const serverUrl = "https://demo.navidrome.org"
            const result = await connect(serverUrl, "demo", "demo");

            if (!result.success) {
                toast.error(result.message || 'Connection failed.');
                return;
            }

            const id = nanoid();

            dispatch(
                addServer({
                    id,
                    type: 'navidrome',
                    serverUrl: "https://demo.navidrome.org",
                    username: "demo",
                    password: "demo",
                    isAuthenticated: true,
                })
            );

            track("connected new server", { type: "navidrome demo" })
            dispatch(setActiveServer(id));
            router.replace('/(home)');
        } catch (e) {
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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View
                    style={styles.mainContent}
                >
                    <Text style={styles.title}>Connect to your Server</Text>

                    <View style={styles.serverTypeContainer}>
                        {(['navidrome', 'jellyfin'] as const).map((type) => {
                            const isSelected = selectedType === type;

                            return (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setSelectedType(type)}
                                    style={[
                                        styles.serverTypeButton,
                                        isSelected && styles.serverTypeButtonSelected,
                                    ]}
                                >
                                    <Image
                                        source={type === 'navidrome' ? NavidromeIcon : JellyfinIcon}
                                        style={{ width: 36, height: 36, marginBottom: 6 }}
                                        resizeMode="contain"
                                    />
                                    <Text
                                        style={[
                                            styles.serverTypeText,
                                            isSelected && styles.serverTypeTextSelected,
                                        ]}
                                    >
                                        {type === 'navidrome' ? 'Navidrome' : 'Jellyfin'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {selectedType && (
                        <Text style={styles.description}>
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
                        onChangeText={setLocalServerUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        keyboardType="url"
                        returnKeyType="next"
                        onSubmitEditing={handleNext}
                    />
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
                            (selectedType === 'jellyfin' || isTesting) &&
                            styles.nextButtonDisabled,
                        ]}
                        onPress={handleDemo}
                        disabled={selectedType === 'jellyfin' || isTesting}
                    >
                        <Text style={styles.demoButtonText}>
                            {selectedType === 'jellyfin'
                                ? 'Demo unavailable for Jellyfin'
                                : 'Use Navidrome demo'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
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