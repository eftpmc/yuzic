import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
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

export default function Credentials() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const router = useRouter();

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
    const [quickSecret, setQuickSecret] = useState('');
    const [isPolling, setIsPolling] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

            pollIntervalRef.current = setInterval(async () => {
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
                                <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                            )}
                            {isPolling && quickCode ? (
                                <View style={styles.quickConnectWaiting}>
                                    <SpinningLoaderCircle size={16} color="#888" />
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
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#888" style={styles.inputIcon} />
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
                                <Lock size={20} color="#888" style={styles.inputIcon} />
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

                            {/* Reverse proxy auth */}
                            <TouchableOpacity
                                style={styles.proxyToggle}
                                onPress={() => setProxyExpanded(v => !v)}
                                activeOpacity={0.7}
                            >
                                <Shield size={16} color="#666" style={styles.proxyToggleIcon} />
                                <Text style={styles.proxyToggleText}>Reverse proxy auth</Text>
                                {proxyExpanded ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
                            </TouchableOpacity>

                            {proxyExpanded && (
                                <View style={styles.proxySection}>
                                    {insecureWithProxy && (
                                        <View style={styles.warningRow}>
                                            <TriangleAlert size={15} color="#f59e0b" />
                                            <Text style={styles.warningText}>
                                                Basic auth over HTTP sends credentials unencrypted. Use HTTPS.
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.inputWrapper}>
                                        <User size={20} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            ref={proxyUsernameRef}
                                            style={styles.input}
                                            placeholder="Proxy username"
                                            placeholderTextColor="#555"
                                            value={proxyUsername}
                                            onChangeText={setProxyUsername}
                                            autoCapitalize="none"
                                            returnKeyType="next"
                                            onSubmitEditing={() => proxyPasswordRef.current?.focus()}
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <Lock size={20} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            ref={proxyPasswordRef}
                                            style={styles.input}
                                            placeholder="Proxy password"
                                            placeholderTextColor="#555"
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
                                <TouchableOpacity
                                    style={styles.quickConnectToggle}
                                    onPress={handleStartQuickConnect}
                                    disabled={isTesting}
                                    activeOpacity={0.7}
                                >
                                    <QrCode size={16} color="#666" style={styles.proxyToggleIcon} />
                                    <Text style={styles.proxyToggleText}>Use Quick Connect</Text>
                                    <ChevronRight size={16} color="#666" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    {!quickConnectMode && (
                        <TouchableOpacity
                            style={[styles.nextButton, isTesting && styles.nextButtonDisabled]}
                            onPress={handleNext}
                            disabled={isTesting}
                        >
                            {isTesting
                                ? <ActivityIndicator size="small" color="#000" />
                                : <Text style={styles.nextButtonText}>{t('common.done')}</Text>
                            }
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={quickConnectMode ? handleCancelQuickConnect : () => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            {quickConnectMode ? 'Use password instead' : t('common.back')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    mainContent: { flexGrow: 1, paddingHorizontal: 20, marginTop: 40 },
    buttonContainer: { padding: 20, backgroundColor: '#000', alignItems: 'center' },
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
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: '#fff', fontSize: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#888', marginBottom: 20 },
    proxyToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 4,
    },
    quickConnectToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 8,
    },
    proxyToggleIcon: { marginRight: 7 },
    proxyToggleText: { flex: 1, fontSize: 14, color: '#666' },
    proxySection: { marginTop: 4, marginBottom: 8 },
    warningRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#1c1400',
        borderWidth: 1,
        borderColor: '#78450a',
        borderRadius: 8,
        padding: 10,
        marginBottom: 14,
        gap: 8,
    },
    warningText: { flex: 1, fontSize: 13, color: '#f59e0b', lineHeight: 18 },
    // Quick Connect panel
    quickConnectPanel: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 16,
    },
    quickConnectLabel: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
    },
    quickConnectCode: {
        fontSize: 48,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 8,
    },
    quickConnectWaiting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickConnectWaitingText: {
        fontSize: 14,
        color: '#888',
    },
    quickConnectHint: {
        fontSize: 13,
        color: '#555',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 12,
    },
    // Buttons
    nextButton: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    nextButtonDisabled: { opacity: 0.6 },
    nextButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
    backButton: {
        backgroundColor: '#333',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 4,
    },
    backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
