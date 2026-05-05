import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@backpackapp-io/react-native-toast';
import { nanoid } from '@reduxjs/toolkit';
import { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { useDispatch } from 'react-redux';
import { ServerType } from '@/types';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';
import { useTranslation } from 'react-i18next';

export default function Connect() {
    const [selectedType, setSelectedType] = useState<ServerType | null>(null);
    const [isLayoutMounted, setIsLayoutMounted] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        const timer = setTimeout(() => setIsLayoutMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        if (!selectedType) {
            toast.error(t('onboarding.connect.selectTypeFirst'));
            return;
        }
        router.push({
            pathname: '/(onboarding)/address',
            params: { type: selectedType },
        });
    };

    const handleDemo = async () => {
        if (!selectedType) return;
        const provider = SERVER_PROVIDERS[selectedType];
        if (!provider.capabilities.supportsDemo || !provider.demo) {
            toast.error(t('onboarding.connect.demoUnavailableProvider'));
            return;
        }
        setIsTesting(true);
        try {
            const demo = await provider.demo();
            const id = nanoid();
            dispatch(addServer({
                id,
                type: selectedType,
                serverUrl: demo.serverUrl,
                username: demo.username,
                auth: demo.auth,
                isAuthenticated: true,
            }));
            dispatch(setActiveServer(id));
            router.replace('/(home)/(tabs)' as never);
        } catch {
            toast.error(t('onboarding.connect.connectError'));
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

    const providers = Object.values(SERVER_PROVIDERS);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>{t('onboarding.connect.title')}</Text>
                <Text style={styles.subtitle}>{t('onboarding.connect.subtitle')}</Text>

                <View style={styles.serverTypeContainer}>
                    {providers.map((provider) => {
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
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
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
                        {t(`onboarding.connect.providerDescription.${selectedType}`)}
                    </Text>
                )}
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.nextButton, isTesting && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={isTesting}
                >
                    {isTesting ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.demoButton,
                        (!selectedType || !SERVER_PROVIDERS[selectedType]?.capabilities.supportsDemo || isTesting) && styles.buttonDisabled,
                    ]}
                    onPress={handleDemo}
                    disabled={!selectedType || !SERVER_PROVIDERS[selectedType]?.capabilities.supportsDemo || isTesting}
                >
                    <Text style={styles.demoButtonText}>
                        {selectedType && SERVER_PROVIDERS[selectedType]?.capabilities.supportsDemo
                            ? t('onboarding.connect.useDemo', { provider: SERVER_PROVIDERS[selectedType].label })
                            : t('onboarding.connect.demoUnavailable')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
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
        marginBottom: 4,
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
    buttonDisabled: {
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
