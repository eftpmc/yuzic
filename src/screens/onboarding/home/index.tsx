import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableWithoutFeedback,
    StyleSheet,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '@/components/Loader';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { setHasSeenGetStarted } from '@/utils/redux/slices/settingsSlice';
import { selectHasSeenGetStarted, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';

export default function Home() {
    const router = useRouter();
    const themeColor = useSelector(selectThemeColor);
    const dispatch = useDispatch();
    const [isPressed, setIsPressed] = useState(false);
    const [ready, setReady] = useState(false);

    const hasSeenGetStarted = useSelector(selectHasSeenGetStarted);

    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(home)');
            return;
        }

        if (hasSeenGetStarted) {
            router.replace('/(onboarding)/servers');
            return;
        }

        setReady(true);
    }, [isAuthenticated, hasSeenGetStarted]);

    const handlePressIn = () => setIsPressed(true);

    const handlePressOut = async () => {
        setIsPressed(false);

        dispatch(setHasSeenGetStarted(true));
        router.push('/(onboarding)/servers');
    };

    if (!ready) {
        return (
            <SafeAreaView style={styles.container}>
                <Loader />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Image
                    source={require('@assets/images/logo.png')}
                    style={styles.appIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
                <Text style={styles.appName}>Yuzic</Text>
                <Text style={styles.subtext}>
                    Your personal music library. Stream from your own server anywhere.
                </Text>
            </View>

            <View style={styles.bottomContent}>
                <TouchableWithoutFeedback
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <View style={styles.buttonContainer}>
                        <View
                            style={[
                                styles.offsetButton,
                                { backgroundColor: `${themeColor}AA` },
                            ]}
                        />
                        <View
                            style={[
                                styles.button,
                                { backgroundColor: themeColor, shadowColor: themeColor },
                                isPressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.buttonText}>Get Started</Text>
                        </View>
                    </View>
                </TouchableWithoutFeedback>

                <Text style={styles.termsText}>
                    By continuing you confirm that you've read and accepted our Terms and
                    Privacy Policy
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appIcon: {
        width: 150,
        height: 150,
        marginBottom: 30,
        borderRadius: 8,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtext: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    bottomContent: {
        width: '100%',
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    buttonContainer: {
        width: '90%',
        alignItems: 'center',
        marginBottom: 12,
    },
    offsetButton: {
        position: 'absolute',
        top: 6,
        width: '100%',
        height: 48,
        borderRadius: 8,
        zIndex: -1,
    },
    button: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    buttonPressed: {
        top: 6,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    termsText: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 10,
        marginTop: 12,
    },
});