import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { nanoid } from '@reduxjs/toolkit';
import { ServerType } from '@/types';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';
import { useTranslation } from 'react-i18next';

export default function Credentials() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const router = useRouter();

    const params = useLocalSearchParams<{
        type: ServerType;
        serverUrl: string;
    }>();

    const { type, serverUrl } = params;

    const [localUsername, setLocalUsername] = useState('');
    const [localPassword, setLocalPassword] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const passwordRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!type || !serverUrl) {
            router.replace('/(onboarding)/servers');
        }
    }, [type, serverUrl]);

    const handleNext = async () => {
        if (!type || !serverUrl) return;

        if (!localUsername || !localPassword) {
            toast.error(t('onboarding.credentials.missingCredentials'));
            return;
        }

        const provider = SERVER_PROVIDERS[type];
        setIsTesting(true);

        try {
            const result = await provider.connect(
                serverUrl,
                localUsername,
                localPassword
            );

            if (!result.success || !result.auth) {
                toast.error(result.message || t('onboarding.credentials.authFailed'));
                return;
            }

            const pingOk = await provider.ping(serverUrl, localUsername, result.auth);

            if (!pingOk) {
                toast.error(t('onboarding.credentials.apiNotResponding'));
                return;
            }

            const id = nanoid();

            dispatch(
                addServer({
                    id,
                    type,
                    serverUrl,
                    username: localUsername,
                    auth: result.auth,
                    isAuthenticated: true,
                })
            );

            dispatch(setActiveServer(id));
            router.replace('/(home)');
        } catch (err) {
            toast.error(t('onboarding.credentials.connectError'));
        } finally {
            setIsTesting(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }}>
                <View style={styles.mainContent}>
                    <Text style={styles.title}>{t('onboarding.credentials.title')}</Text>

                    <Text style={styles.subtitle}>
                        {t('onboarding.credentials.subtitle')}
                    </Text>

                    <View style={styles.inputWrapper}>
                        <AntDesign name="user" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('onboarding.credentials.usernamePlaceholder')}
                            placeholderTextColor="#888"
                            value={localUsername}
                            onChangeText={setLocalUsername}
                            autoCapitalize="none"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <AntDesign name="lock" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            ref={passwordRef}
                            style={styles.input}
                            placeholder={t('onboarding.credentials.passwordPlaceholder')}
                            placeholderTextColor="#888"
                            secureTextEntry
                            value={localPassword}
                            onChangeText={setLocalPassword}
                            autoCapitalize="none"
                            returnKeyType="done"
                            onSubmitEditing={handleNext}
                        />
                    </View>
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
                            <Text style={styles.nextButtonText}>{t('common.done')}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                    >
                        <Text style={styles.backButtonText}>{t('common.back')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mainContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        marginTop: 40,
    },
    buttonContainer: {
        padding: 20,
        backgroundColor: '#000',
        alignItems: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#555',
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
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
    backButton: {
        backgroundColor: '#333',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 4,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});