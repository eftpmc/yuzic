import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { User, Lock, Shield, ChevronUp, ChevronDown, TriangleAlert, QrCode, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { notify } from '@/components/toast';
import { nanoid } from '@reduxjs/toolkit';
import { ProviderAuth, SERVER_PROVIDERS } from '@/utils/servers/registry';
import { ServerType, BasicAuth } from '@/types';
import { useTranslation } from 'react-i18next';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { iconSize, onDark, spacing, statusColor, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useCodeAuth } from './useCodeAuth';

export default function Credentials() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const router = useRouter();
    const rad = useRadius();

    const params = useLocalSearchParams<{ type: ServerType; serverUrl: string }>();
    const { type, serverUrl } = params;

    const [localUsername, setLocalUsername] = useState('');
    const [localPassword, setLocalPassword] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const [proxyExpanded, setProxyExpanded] = useState(false);
    const [proxyUsername, setProxyUsername] = useState('');
    const [proxyPassword, setProxyPassword] = useState('');

    const passwordRef = useRef<TextInput>(null);
    const proxyUsernameRef = useRef<TextInput>(null);
    const proxyPasswordRef = useRef<TextInput>(null);

    const buildBasicAuth = (): BasicAuth | undefined => {
        const u = proxyUsername.trim();
        const p = proxyPassword.trim();
        return u && p ? { username: u, password: p } : undefined;
    };

    // Whether this provider can sign in by code at all. Presence-gated, so a
    // provider that gains the flow gets the row with no change to this screen
    // and one that lacks it never renders it.
    const codeAuth = type ? SERVER_PROVIDERS[type]?.codeAuth : undefined;
    const { phase, start: startCodeAuth, cancel: cancelCodeAuth } = useCodeAuth({
        codeAuth,
        serverUrl,
        basicAuth: buildBasicAuth(),
    });

    const inCodeAuth = phase.status !== 'idle';

    const insecureWithProxy =
        proxyUsername.trim().length > 0 &&
        typeof serverUrl === 'string' &&
        serverUrl.startsWith('http://');

    useEffect(() => {
        if (!type || !serverUrl) router.replace('/(onboarding)/servers');
    }, [router, type, serverUrl]);

    const saveServer = (auth: ProviderAuth, usernameOverride?: string) => {
        const id = nanoid();
        dispatch(addServer({
            id, type, serverUrl,
            username: usernameOverride ?? localUsername,
            auth,
            basicAuth: buildBasicAuth(),
            isAuthenticated: true,
        }));
        dispatch(setActiveServer(id));
        router.push(`/(onboarding)/libraries?serverId=${id}`);
    };

    // The hook owns the state machine; this screen only reacts to it landing on
    // a terminal phase.
    useEffect(() => {
        if (phase.status === 'approved') {
            saveServer(phase.auth, phase.username);
            return;
        }
        if (phase.status === 'failed') {
            notify.error(
                phase.reason === 'expired'
                    ? t('onboarding.credentials.codeAuth.expired')
                    : phase.message || t('onboarding.credentials.codeAuth.unavailable')
            );
            cancelCodeAuth();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ── Username / password ──────────────────────────────────────────────────

    const handleNext = async () => {
        if (!type || !serverUrl) return;
        if (!localUsername || !localPassword) {
            notify.error(t('onboarding.credentials.missingCredentials'));
            return;
        }
        const provider = SERVER_PROVIDERS[type];
        const basicAuth = buildBasicAuth();
        setIsTesting(true);
        try {
            const result = await provider.connect(serverUrl, localUsername, localPassword, basicAuth);
            if (!result.success || !result.auth) {
                notify.error(result.message || t('onboarding.credentials.authFailed'));
                return;
            }
            const pingOk = await provider.ping(serverUrl, localUsername, result.auth, basicAuth);
            if (!pingOk) {
                notify.error(t('onboarding.credentials.apiNotResponding'));
                return;
            }
            saveServer(result.auth);
        } catch {
            notify.error(t('onboarding.credentials.connectError'));
        } finally {
            setIsTesting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }}>
                <View style={styles.mainContent}>
                    <Text style={styles.title}>{t('onboarding.credentials.title')}</Text>
                    <Text style={styles.subtitle}>{t('onboarding.credentials.subtitle')}</Text>

                    {inCodeAuth ? (
                        // ── Code sign-in panel ───────────────────────────────
                        <View style={styles.codeAuthPanel}>
                            <Text style={styles.codeAuthLabel}>
                                {t('onboarding.credentials.codeAuth.enterCode')}
                            </Text>
                            {phase.status === 'waiting' ? (
                                <Text style={styles.codeAuthCode}>{phase.code}</Text>
                            ) : (
                                <View style={{ marginVertical: spacing.roomy }}>
                                  <SpinningLoaderCircle size={iconSize.loader} color={onDark.text} />
                                </View>
                            )}
                            {phase.status === 'waiting' ? (
                                <View style={styles.codeAuthWaiting}>
                                    <SpinningLoaderCircle size={iconSize.inline} color={onDark.mutedText} />
                                    <Text style={styles.codeAuthWaitingText}>
                                        {t('onboarding.credentials.codeAuth.waiting')}
                                    </Text>
                                </View>
                            ) : null}
                            {codeAuth ? (
                                <Text style={styles.codeAuthHint}>{t(codeAuth.instructionKey)}</Text>
                            ) : null}
                        </View>
                    ) : (
                        // ── Username / password form ──────────────────────────
                        <>
                            <View style={[styles.inputWrapper, { borderRadius: rad.md }]}>
                                <User size={iconSize.control} color={onDark.mutedText} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('onboarding.credentials.usernamePlaceholder')}
                                    placeholderTextColor={onDark.mutedText}
                                    value={localUsername}
                                    onChangeText={setLocalUsername}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>

                            <View style={[styles.inputWrapper, { borderRadius: rad.md }]}>
                                <Lock size={iconSize.control} color={onDark.mutedText} style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    style={styles.input}
                                    placeholder={t('onboarding.credentials.passwordPlaceholder')}
                                    placeholderTextColor={onDark.mutedText}
                                    secureTextEntry
                                    value={localPassword}
                                    onChangeText={setLocalPassword}
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleNext}
                                />
                            </View>

                            {/* Reverse proxy auth */}
                            <Touchable
                                style={styles.proxyToggle}
                                onPress={() => setProxyExpanded(v => !v)}
                            >
                                <Shield size={iconSize.inline} color={onDark.mutedText} style={styles.proxyToggleIcon} />
                                <Text style={styles.proxyToggleText}>{t('onboarding.credentials.proxy.toggle')}</Text>
                                {proxyExpanded ? <ChevronUp size={iconSize.inline} color={onDark.mutedText} /> : <ChevronDown size={iconSize.inline} color={onDark.mutedText} />}
                            </Touchable>

                            {proxyExpanded && (
                                <View style={styles.proxySection}>
                                    {insecureWithProxy && (
                                        <View style={[styles.warningRow, { borderRadius: rad.md }]}>
                                            <TriangleAlert size={iconSize.inline} color={statusColor.warningText} />
                                            <Text style={styles.warningText}>
                                                {t('onboarding.credentials.proxy.insecureWarning')}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.inputWrapper, { borderRadius: rad.md }]}>
                                        <User size={iconSize.control} color={onDark.mutedText} style={styles.inputIcon} />
                                        <TextInput
                                            ref={proxyUsernameRef}
                                            style={styles.input}
                                            placeholder={t('onboarding.credentials.proxy.usernamePlaceholder')}
                                            placeholderTextColor={onDark.mutedText}
                                            value={proxyUsername}
                                            onChangeText={setProxyUsername}
                                            autoCapitalize="none"
                                            returnKeyType="next"
                                            onSubmitEditing={() => proxyPasswordRef.current?.focus()}
                                        />
                                    </View>
                                    <View style={[styles.inputWrapper, { borderRadius: rad.md }]}>
                                        <Lock size={iconSize.control} color={onDark.mutedText} style={styles.inputIcon} />
                                        <TextInput
                                            ref={proxyPasswordRef}
                                            style={styles.input}
                                            placeholder={t('onboarding.credentials.proxy.passwordPlaceholder')}
                                            placeholderTextColor={onDark.mutedText}
                                            secureTextEntry
                                            value={proxyPassword}
                                            onChangeText={setProxyPassword}
                                            autoCapitalize="none"
                                            returnKeyType="done"
                                            onSubmitEditing={handleNext}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Code sign-in, where the provider offers one */}
                            {codeAuth && (
                                <Touchable
                                    style={styles.codeAuthToggle}
                                    onPress={startCodeAuth}
                                    disabled={isTesting}
                                >
                                    <QrCode size={iconSize.inline} color={onDark.mutedText} style={styles.proxyToggleIcon} />
                                    <Text style={styles.proxyToggleText}>{t(codeAuth.actionKey)}</Text>
                                    <ChevronRight size={iconSize.inline} color={onDark.mutedText} />
                                </Touchable>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    {!inCodeAuth && (
                        <Touchable
                            style={[styles.nextButton, { borderRadius: rad.pill }, isTesting && styles.nextButtonDisabled]}
                            onPress={handleNext}
                            disabled={isTesting}
                        >
                            {isTesting
                                ? <SpinningLoaderCircle size={iconSize.row} color="#000" />
                                : <Text style={styles.nextButtonText}>{t('common.done')}</Text>
                            }
                        </Touchable>
                    )}

                    <Touchable
                        style={[styles.backButton, { borderRadius: rad.pill }]}
                        onPress={inCodeAuth ? cancelCodeAuth : () => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            {inCodeAuth ? t('onboarding.credentials.codeAuth.usePassword') : t('common.back')}
                        </Text>
                    </Touchable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: onDark.background },
    mainContent: { flexGrow: 1, paddingHorizontal: spacing.roomy, marginTop: spacing.xxxl },
    buttonContainer: { padding: spacing.roomy, backgroundColor: onDark.background, alignItems: 'center' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: onDark.muted,
        borderWidth: 1,
        borderColor: onDark.mutedText,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
        height: 50,
    },
    inputIcon: { marginRight: spacing.controlGap },
    input: { ...typography.body, flex: 1, color: onDark.text },
    title: { ...typography.display, color: onDark.text, marginBottom: spacing.controlGap },
    subtitle: { ...typography.body, color: onDark.mutedText, marginBottom: spacing.roomy },
    proxyToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.controlGap,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xs,
    },
    codeAuthToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.controlGap,
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
    },
    proxyToggleIcon: { marginRight: spacing.tight },
    proxyToggleText: { ...typography.rowSubtitle, flex: 1, color: onDark.mutedText },
    proxySection: { marginTop: spacing.xs, marginBottom: spacing.sm },
    warningRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#1c1400',
        borderWidth: 1,
        borderColor: '#78450a',
        padding: spacing.controlGap,
        marginBottom: spacing.md,
        gap: 8,
    },
    warningText: { ...typography.caption, flex: 1, color: statusColor.warningText },
    // Code sign-in panel
    codeAuthPanel: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: 16,
    },
    codeAuthLabel: {
        ...typography.body,
        color: onDark.mutedText,
        textAlign: 'center',
    },
    codeAuthCode: {
        ...typography.hero,
        fontWeight: '700',
        color: onDark.text,
        letterSpacing: 8,
    },
    codeAuthWaiting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    codeAuthWaitingText: {
        ...typography.rowSubtitle,
        color: onDark.mutedText,
    },
    codeAuthHint: {
        ...typography.caption,
        color: onDark.mutedText,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    // Buttons
    nextButton: {
        backgroundColor: onDark.text,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },
    nextButtonDisabled: { opacity: 0.6 },
    nextButtonText: { ...typography.sheetTitle, color: '#000' },
    backButton: {
        backgroundColor: onDark.border,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xs,
    },
    backButtonText: { ...typography.sheetTitle, color: onDark.text },
});
