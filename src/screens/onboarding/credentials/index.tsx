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
import { toast } from '@backpackapp-io/react-native-toast';
import { nanoid } from '@reduxjs/toolkit';
import { ProviderAuth, SERVER_PROVIDERS } from '@/utils/servers/registry';
import { ServerType, BasicAuth } from '@/types';
import { useTranslation } from 'react-i18next';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import {
    initiateQuickConnect,
    pollQuickConnect,
    authenticateWithQuickConnect,
} from '@/api/jellyfin/auth/quickConnect';
import Touchable from '@/components/Touchable';
import { iconSize, onDark, spacing, statusColor, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

// Quick Connect codes expire server-side; without a client-side ceiling too,
// polling would continue forever showing "waiting for approval" with no
// indication the code had gone stale.
const QUICK_CONNECT_TIMEOUT_MS = 10 * 60 * 1000;

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

    // Quick Connect state (Jellyfin only)
    const [quickConnectMode, setQuickConnectMode] = useState(false);
    const [quickCode, setQuickCode] = useState('');
    const [, setQuickSecret] = useState('');
    const [isPolling, setIsPolling] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollStartedAtRef = useRef(0);

    const passwordRef = useRef<TextInput>(null);
    const proxyUsernameRef = useRef<TextInput>(null);
    const proxyPasswordRef = useRef<TextInput>(null);

    const isJellyfin = type === 'jellyfin';

    const insecureWithProxy =
        proxyUsername.trim().length > 0 &&
        typeof serverUrl === 'string' &&
        serverUrl.startsWith('http://');

    useEffect(() => {
        if (!type || !serverUrl) router.replace('/(onboarding)/servers');
    }, [router, type, serverUrl]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, []);

    const buildBasicAuth = (): BasicAuth | undefined => {
        const u = proxyUsername.trim();
        const p = proxyPassword.trim();
        return u && p ? { username: u, password: p } : undefined;
    };

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

    // ── Username / password ──────────────────────────────────────────────────

    const handleNext = async () => {
        if (!type || !serverUrl) return;
        if (!localUsername || !localPassword) {
            toast.error(t('onboarding.credentials.missingCredentials'));
            return;
        }
        const provider = SERVER_PROVIDERS[type];
        const basicAuth = buildBasicAuth();
        setIsTesting(true);
        try {
            const result = await provider.connect(serverUrl, localUsername, localPassword, basicAuth);
            if (!result.success || !result.auth) {
                toast.error(result.message || t('onboarding.credentials.authFailed'));
                return;
            }
            const pingOk = await provider.ping(serverUrl, localUsername, result.auth, basicAuth);
            if (!pingOk) {
                toast.error(t('onboarding.credentials.apiNotResponding'));
                return;
            }
            saveServer(result.auth);
        } catch {
            toast.error(t('onboarding.credentials.connectError'));
        } finally {
            setIsTesting(false);
        }
    };

    // ── Quick Connect ────────────────────────────────────────────────────────

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        setIsPolling(false);
    };

    const handleStartQuickConnect = async () => {
        if (!serverUrl) return;
        setQuickConnectMode(true);
        setIsTesting(true);
        try {
            const { secret, code } = await initiateQuickConnect(serverUrl, buildBasicAuth());
            setQuickCode(code);
            setQuickSecret(secret);
            setIsPolling(true);
            pollStartedAtRef.current = Date.now();

            pollIntervalRef.current = setInterval(async () => {
                if (Date.now() - pollStartedAtRef.current > QUICK_CONNECT_TIMEOUT_MS) {
                    stopPolling();
                    toast.error('Quick Connect code expired. Please try again.');
                    setQuickConnectMode(false);
                    setQuickCode('');
                    setQuickSecret('');
                    return;
                }

                const authenticated = await pollQuickConnect(serverUrl, secret, buildBasicAuth());
                if (!authenticated) return;

                stopPolling();
                try {
                    const { token, userId, username } = await authenticateWithQuickConnect(
                        serverUrl, secret, buildBasicAuth()
                    );
                    const auth: ProviderAuth = { token, userId };
                    saveServer(auth, username);
                } catch (err: any) {
                    toast.error(err?.message ?? 'Authentication failed');
                    setQuickConnectMode(false);
                    setQuickCode('');
                    setQuickSecret('');
                }
            }, 3000);
        } catch (err: any) {
            toast.error(err?.message ?? 'Quick Connect unavailable');
            setQuickConnectMode(false);
        } finally {
            setIsTesting(false);
        }
    };

    const handleCancelQuickConnect = () => {
        stopPolling();
        setQuickConnectMode(false);
        setQuickCode('');
        setQuickSecret('');
    };

    // ────────────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }}>
                <View style={styles.mainContent}>
                    <Text style={styles.title}>{t('onboarding.credentials.title')}</Text>
                    <Text style={styles.subtitle}>{t('onboarding.credentials.subtitle')}</Text>

                    {quickConnectMode ? (
                        // ── Quick Connect panel ──────────────────────────────
                        <View style={styles.quickConnectPanel}>
                            <Text style={styles.quickConnectLabel}>
                                Enter this code on your Jellyfin server
                            </Text>
                            {quickCode ? (
                                <Text style={styles.quickConnectCode}>{quickCode}</Text>
                            ) : (
                                <View style={{ marginVertical: spacing.roomy }}>
                                  <SpinningLoaderCircle size={iconSize.loader} color={onDark.text} />
                                </View>
                            )}
                            {isPolling && quickCode ? (
                                <View style={styles.quickConnectWaiting}>
                                    <SpinningLoaderCircle size={iconSize.inline} color={onDark.mutedText} />
                                    <Text style={styles.quickConnectWaitingText}>
                                        Waiting for approval…
                                    </Text>
                                </View>
                            ) : null}
                            <Text style={styles.quickConnectHint}>
                                Go to your Jellyfin dashboard → Quick Connect, then enter the code above.
                            </Text>
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
                                <Text style={styles.proxyToggleText}>Reverse proxy auth</Text>
                                {proxyExpanded ? <ChevronUp size={iconSize.inline} color={onDark.mutedText} /> : <ChevronDown size={iconSize.inline} color={onDark.mutedText} />}
                            </Touchable>

                            {proxyExpanded && (
                                <View style={styles.proxySection}>
                                    {insecureWithProxy && (
                                        <View style={[styles.warningRow, { borderRadius: rad.md }]}>
                                            <TriangleAlert size={iconSize.inline} color={statusColor.warningText} />
                                            <Text style={styles.warningText}>
                                                Basic auth over HTTP sends credentials unencrypted. Use HTTPS.
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.inputWrapper, { borderRadius: rad.md }]}>
                                        <User size={iconSize.control} color={onDark.mutedText} style={styles.inputIcon} />
                                        <TextInput
                                            ref={proxyUsernameRef}
                                            style={styles.input}
                                            placeholder="Proxy username"
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
                                            placeholder="Proxy password"
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

                            {/* Quick Connect option — Jellyfin only */}
                            {isJellyfin && (
                                <Touchable
                                    style={styles.quickConnectToggle}
                                    onPress={handleStartQuickConnect}
                                    disabled={isTesting}
                                >
                                    <QrCode size={iconSize.inline} color={onDark.mutedText} style={styles.proxyToggleIcon} />
                                    <Text style={styles.proxyToggleText}>Use Quick Connect</Text>
                                    <ChevronRight size={iconSize.inline} color={onDark.mutedText} />
                                </Touchable>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    {!quickConnectMode && (
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
                        onPress={quickConnectMode ? handleCancelQuickConnect : () => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            {quickConnectMode ? 'Use password instead' : t('common.back')}
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
    quickConnectToggle: {
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
    // Quick Connect panel
    quickConnectPanel: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: 16,
    },
    quickConnectLabel: {
        ...typography.body,
        color: onDark.mutedText,
        textAlign: 'center',
    },
    quickConnectCode: {
        ...typography.hero,
        fontWeight: '700',
        color: onDark.text,
        letterSpacing: 8,
    },
    quickConnectWaiting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickConnectWaitingText: {
        ...typography.rowSubtitle,
        color: onDark.mutedText,
    },
    quickConnectHint: {
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
