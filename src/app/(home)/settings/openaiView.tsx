import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Appearance
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { toast } from '@backpackapp-io/react-native-toast';

export default function OpenAISettingsView() {
    const { openaiApiKey, setOpenaiApiKey, themeColor } = useSettings();
    const router = useRouter();
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const testConnection = async () => {
        if (!openaiApiKey) {
            toast.error("Please enter an API key first.");
            return;
        }

        try {
            const res = await fetch("https://api.openai.com/v1/models", {
                headers: { Authorization: `Bearer ${openaiApiKey}` }
            });

            if (res.ok) toast.success("OpenAI connection successful!");
            else toast.error("Invalid API Key or network issue.");
        } catch (err) {
            toast.error("Failed to connect.");
        }
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    OpenAI
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    OpenAI API Key
                </Text>

                <TextInput
                    secureTextEntry
                    value={openaiApiKey}
                    onChangeText={setOpenaiApiKey}
                    placeholder="sk-..."
                    placeholderTextColor="#777"
                    style={[styles.input, isDarkMode && styles.inputDark]}
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: themeColor }]}
                    onPress={testConnection}
                >
                    <MaterialIcons name="bolt" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Test Connection</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 6
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
        color: '#000'
    },
    headerTitleDark: { color: '#fff' },
    content: { padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#000' },
    labelDark: { color: '#fff' },
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
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});