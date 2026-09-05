import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableWithoutFeedback,
    StyleSheet,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { setHasSeenGetStarted } from '@/utils/redux/slices/settingsSlice';
import { selectHasSeenGetStarted, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTranslation } from 'react-i18next';
import { spacing, typography, onDark } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export default function Home() {
    const { t } = useTranslation();
    const router = useRouter();
    const themeColor = useSelector(selectThemeColor);
    const dispatch = useDispatch();
    const rad = useRadius();
    const [isPressed, setIsPressed] = useState(false);

    const hasSeenGetStarted = useSelector(selectHasSeenGetStarted);

    const activeServer = useSelector(selectActiveServer);
    const isAuthenticated = activeServer?.isAuthenticated;

    if (isAuthenticated) {
        return <Redirect href="/(home)/(tabs)/(home)" />;
    }

    if (hasSeenGetStarted) {
        return <Redirect href="/(onboarding)/servers" />;
    }

    const handlePressIn = () => setIsPressed(true);

    const handlePressOut = async () => {
        setIsPressed(false);

        dispatch(setHasSeenGetStarted(true));
        router.push('/(onboarding)/servers');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Image
                    source={require('@assets/images/logo.png')}
                    style={[styles.appIcon, { borderRadius: rad.md }]}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
                <Text style={styles.appName}>Yuzic</Text>
                <Text style={styles.subtext}>
                    {t('onboarding.home.subtitle')}
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
                                { backgroundColor: `${themeColor}AA`, borderRadius: rad.md },
                            ]}
                        />
                        <View
                            style={[
                                styles.button,
                                { backgroundColor: themeColor, shadowColor: themeColor, borderRadius: rad.md },
                                isPressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.buttonText}>{t('onboarding.home.getStarted')}</Text>
                        </View>
                    </View>
                </TouchableWithoutFeedback>

                <Text style={styles.termsText}>
                    {t('onboarding.home.terms')}
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
        backgroundColor: onDark.background,
        paddingHorizontal: spacing.roomy,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appIcon: {
        width: 150,
        height: 150,
        marginBottom: spacing.xxl,
    },
    appName: {
        ...typography.display,
        color: onDark.text,
        textAlign: 'center',
        marginBottom: spacing.controlGap,
    },
    subtext: {
        ...typography.body,
        color: onDark.subtext,
        textAlign: 'center',
        paddingHorizontal: spacing.xxl,
    },
    bottomContent: {
        width: '100%',
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    buttonContainer: {
        width: '90%',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    offsetButton: {
        position: 'absolute',
        top: 6,
        width: '100%',
        height: 48,
        zIndex: -1,
    },
    button: {
        width: '100%',
        paddingVertical: spacing.lg,
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
        ...typography.sheetTitle,
        color: onDark.text,
    },
    termsText: {
        ...typography.caption,
        color: onDark.mutedText,
        textAlign: 'center',
        paddingHorizontal: spacing.controlGap,
        marginTop: spacing.md,
    },
});
