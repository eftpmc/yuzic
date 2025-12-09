import React, { useState, useEffect, useRef } from 'react';
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
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServer } from '@/contexts/ServerContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';

export default function CredentialsScreen() {
    const [localUsername, setLocalUsername] = useState('');
    const [localPassword, setLocalPassword] = useState('');
    const passwordRef = useRef<TextInput>(null);
    const [isTesting, setIsTesting] = useState(false);

    const {
        setUsername,
        setPassword,
        username,
        password,
        connectToServer,
        serverType,
    } = useServer();

    const router = useRouter();
    const selectedType = useSelector((state: RootState) => state.server.type);

    useEffect(() => {
        if (username) setLocalUsername(username);
        if (password) setLocalPassword(password);
    }, [username, password]);

    const handleNext = async () => {
        if (!localUsername || !localPassword) {
            Alert.alert('Error', 'Please enter both username and password.');
            return;
        }

        setIsTesting(true);
        try {
            setUsername(localUsername);
            setPassword(localPassword);
            const result = await connectToServer(localUsername, localPassword);
            const success = typeof result === 'boolean' ? result : result?.success;

            if (success) {
                //router.replace('(home)');
            } else {
                Alert.alert(
                    'Error',
                    result?.message || 'Connection failed. Check your credentials.'
                );
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while testing the connection.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const isJellyfin = serverType === 'jellyfin';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <AntDesign name="arrowleft" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <Text style={styles.title}>Enter Your Credentials</Text>
                        <Text style={styles.subtitle}>
                            {isJellyfin
                                ? 'Provide your Jellyfin username and password to continue.'
                                : 'Provide your Navidrome username and password to continue.'}
                        </Text>

                        <View style={styles.inputWrapper}>
                            <AntDesign name="user" size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
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
                                placeholder="Password"
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
                            <Text style={styles.nextButtonText}>Done</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
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
    backButton: {
        marginTop: 10,
        marginBottom: 10,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
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
});
