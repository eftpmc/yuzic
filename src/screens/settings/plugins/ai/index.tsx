import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Appearance,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from '@backpackapp-io/react-native-toast';
import { useDispatch, useSelector } from 'react-redux';

import {
    selectThemeColor,
    selectAiProvider,
    selectActiveAiApiKey,
} from '@/utils/redux/selectors/settingsSelectors';

import {
    setAiProvider,
    setAiApiKey,
} from '@/utils/redux/slices/settingsSlice';

import { testConnection as testOpenAI } from '@/api/openai/testConnection';
import Header from '../../components/Header';
import { useTheme } from '@/hooks/useTheme';

export default function AIView() {
    const dispatch = useDispatch();

    const themeColor = useSelector(selectThemeColor);
    const activeProvider = useSelector(selectAiProvider);
    const apiKey = useSelector(selectActiveAiApiKey);

    const { isDarkMode } = useTheme();

    const providers = [
        {
            id: 'openai',
            label: 'OpenAI',
            image: require('@assets/images/ai/openai.png')
        },
        {
            id: 'anthropic',
            label: 'Anthropic',
            image: require('@assets/images/ai/anthropic.png'),
        },
        {
            id: 'gemini',
            label: 'Gemini',
            image: require('@assets/images/ai/gemini.png'),
        },
    ] as const;

    const ping = async () => {
        if (!apiKey) {
            toast.error('Please enter an API key first.');
            return;
        }

        try {
            switch (activeProvider) {
                case 'openai': {
                    const ok = await testOpenAI(apiKey);
                    ok
                        ? toast.success('OpenAI connection successful!')
                        : toast.error('Invalid API key.');
                    return;
                }

                case 'anthropic':
                case 'gemini':
                    toast.error('Test not implemented yet.');
                    return;

                default:
                    toast.error('Unknown provider.');
                    return;
            }
        } catch {
            toast.error('Failed to connect.');
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            <Header title="AI Providers" />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Provider Selector */}
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                        Choose which AI provider to use
                    </Text>

                    <View style={styles.grid}>
                        {providers.map((p, index) => {
                            const active = p.id === activeProvider;
                            const isLast = index === providers.length - 1;

                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => dispatch(setAiProvider(p.id))}
                                    activeOpacity={0.85}
                                    style={[
                                        styles.providerTile,
                                        !isLast && styles.providerTileSpacing,
                                        {
                                            borderColor: active
                                                ? themeColor
                                                : isDarkMode
                                                    ? '#333'
                                                    : '#ddd',
                                            backgroundColor: isDarkMode ? '#1a1a1a' : '#f6f6f6',
                                            opacity: p.id === 'openai' ? 1 : 0.7
                                        },
                                    ]}
                                >
                                    <Image
                                        source={p.image}
                                        style={[
                                            styles.providerImage,
                                            { opacity: active ? 1 : 0.75 },
                                        ]}
                                        resizeMode="contain"
                                    />

                                    <Text
                                        style={[
                                            styles.providerLabel,
                                            {
                                                color: isDarkMode ? '#fff' : '#000',
                                                fontWeight: active ? '600' : '400',
                                            },
                                        ]}
                                    >
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text
                        style={[
                            styles.providerWipNote,
                            isDarkMode && styles.providerWipNoteDark,
                        ]}
                    >
                        This feature is work-in-progress
                    </Text>

                </View>

                {/* API Key Input */}
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    {providers.find(p => p.id === activeProvider)?.label} API Key
                </Text>

                <TextInput
                    secureTextEntry
                    value={apiKey}
                    onChangeText={text =>
                        dispatch(setAiApiKey({ provider: activeProvider, key: text }))
                    }
                    placeholder="API key"
                    placeholderTextColor="#777"
                    style={[styles.input, isDarkMode && styles.inputDark]}
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: themeColor }]}
                    onPress={ping}
                >
                    <MaterialIcons name="bolt" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Test Connection</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
        color: '#000',
    },
    headerTitleDark: {
        color: '#fff',
    },

    content: {
        padding: 16,
    },

    section: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 24,
    },
    sectionDark: {
        backgroundColor: '#111',
    },

    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: {
        color: '#aaa',
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'space-between',
    },

    providerTile: {
        flex: 1,
        height: 78,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    providerTileSpacing: {
        marginRight: 10,
    },

    providerImage: {
        width: 26,
        height: 26,
        marginBottom: 6,
    },

    providerLabel: {
        fontSize: 12,
    },

    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        color: '#000',
    },
    labelDark: {
        color: '#fff',
    },

    input: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 10,
        marginBottom: 20,
        borderColor: '#ccc',
        backgroundColor: '#fff',
        color: '#000',
    },
    inputDark: {
        borderColor: '#444',
        backgroundColor: '#1a1a1a',
        color: '#fff',
    },

    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    providerWipNote: {
        marginTop: 12,
        fontSize: 11,
        textAlign: 'center',
        color: '#666',
    },
    providerWipNoteDark: {
        color: '#999',
    },
});