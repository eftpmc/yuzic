import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { spacing, typography, onDark } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export default function Connect() {
    const [selectedType, setSelectedType] = useState<ServerType | null>(null);
    const [isLayoutMounted, setIsLayoutMounted] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch();
    const rad = useRadius();

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
            router.replace('/(home)/(tabs)/(home)');
        } catch {
            toast.error(t('onboarding.connect.connectError'));
        } finally {
            setIsTesting(false);
        }
    };

    if (!isLayoutMounted) {
        return (
            <View style={styles.loadingContainer}>
                <SpinningLoaderCircle size={26} color={onDark.mutedText} />
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
                            <Touchable
                                key={provider.type}
                                onPress={() => setSelectedType(provider.type)}
                                style={[
                                    styles.serverTypeButton,
                                    { borderRadius: rad.card },
                                    isSelected && styles.serverTypeButtonSelected,
                                ]}
                            >
                                <Image
                                    source={provider.icon}
                                    style={{ width: 36, height: 36, marginBottom: spacing.tight }}
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
                            </Touchable>
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
                <Touchable
                    style={[styles.nextButton, { borderRadius: rad.pill }, isTesting && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={isTesting}
                >
                    {isTesting ? (
                        <SpinningLoaderCircle size={18} color="#000" />
                    ) : (
                        <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                    )}
                </Touchable>

                <Touchable
                    style={[
                        styles.demoButton,
                        { borderRadius: rad.pill },
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
                </Touchable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: onDark.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: onDark.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.roomy,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.roomy,
    },
    title: {
        ...typography.display,
        color: onDark.text,
        marginBottom: spacing.controlGap,
    },
    subtitle: {
        ...typography.body,
        color: onDark.mutedText,
        marginBottom: spacing.roomy,
    },
    description: {
        color: onDark.subtext,
        marginBottom: spacing.roomy,
        marginTop: spacing.sm,
    },
    serverTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: spacing.xs,
    },
    serverTypeButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: onDark.mutedText,
        backgroundColor: onDark.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serverTypeButtonSelected: {
        borderColor: onDark.text,
        backgroundColor: onDark.text,
    },
    serverTypeText: {
        ...typography.label,
        color: onDark.text,
        marginTop: spacing.tight,
    },
    serverTypeTextSelected: {
        color: '#000',
    },
    buttonContainer: {
        padding: spacing.roomy,
        backgroundColor: onDark.background,
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: onDark.text,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        ...typography.sheetTitle,
        color: '#000',
    },
    demoButton: {
        backgroundColor: onDark.border,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xs,
    },
    demoButtonText: {
        ...typography.sheetTitle,
        color: onDark.text,
    },
});
