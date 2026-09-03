import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@backpackapp-io/react-native-toast';
import { ChevronDown, Lock, LockOpen, Check } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ServerType } from '@/types';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useSheetRef } from '@/utils/useSheetRef';
import Touchable from '@/components/Touchable';
import { spacing, typography, onDark } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Scheme = 'https' | 'http';

export default function Address() {
    const { t } = useTranslation();
    const router = useRouter();
    const { type } = useLocalSearchParams<{ type: ServerType }>();
    const rad = useRadius();

    const [scheme, setScheme] = useState<Scheme>('https');
    const [host, setHost] = useState('');

    const schemeSheetRef = useSheetRef();
    const snapPoints = useMemo(() => ['28%'], []);

    const handleNext = () => {
        if (!host.trim()) {
            toast.error(t('onboarding.address.enterUrl'));
            return;
        }
        router.push({
            pathname: '/(onboarding)/credentials',
            params: { type, serverUrl: `${scheme}://${host.trim()}` },
        });
    };

    return (
        <>
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1 }}>
                    <View style={styles.mainContent}>
                        <Text style={styles.title}>{t('onboarding.address.title')}</Text>
                        <Text style={styles.subtitle}>{t('onboarding.address.subtitle')}</Text>

                        <View style={[styles.inputRow, { borderRadius: rad.md }]}>
                            <Touchable
                                style={styles.schemeButton}
                                onPress={() => schemeSheetRef.current?.present()}
                            >
                                <Text style={styles.schemeText}>{scheme}://</Text>
                                <ChevronDown size={14} color={onDark.mutedText} style={{ marginLeft: spacing.xs }} />
                            </Touchable>

                            <TextInput
                                style={styles.hostInput}
                                placeholder="your-server.com"
                                placeholderTextColor={onDark.mutedText}
                                value={host}
                                onChangeText={setHost}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardAppearance="dark"
                                keyboardType="url"
                                returnKeyType="done"
                                onSubmitEditing={handleNext}
                                autoFocus
                            />
                        </View>

                        <Text style={styles.hint}>{t('onboarding.address.hint')}</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Touchable style={[styles.nextButton, { borderRadius: rad.pill }]} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                        </Touchable>

                        <Touchable style={[styles.backButton, { borderRadius: rad.pill }]} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>{t('common.back')}</Text>
                        </Touchable>
                    </View>
                </View>
            </SafeAreaView>

            <BottomSheetModal
                ref={schemeSheetRef}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
            >
                <BottomSheetView style={styles.sheetContent}>
                    <Text style={styles.sheetTitle}>{t('onboarding.address.schemeTitle')}</Text>

                    {(['https', 'http'] as Scheme[]).map((s) => {
                        const isSelected = scheme === s;
                        return (
                            <Touchable
                                key={s}
                                style={[styles.schemeOption, { borderRadius: rad.md }, isSelected && styles.schemeOptionSelected]}
                                onPress={() => {
                                    setScheme(s);
                                    schemeSheetRef.current?.dismiss();
                                }}
                            >
                                <View style={styles.schemeOptionLeft}>
                                    {s === 'https'
                                      ? <Lock size={18} color={isSelected ? onDark.text : onDark.mutedText} style={{ marginRight: spacing.controlGap }} />
                                      : <LockOpen size={18} color={isSelected ? onDark.text : onDark.mutedText} style={{ marginRight: spacing.controlGap }} />
                                    }
                                    <View>
                                        <Text style={[styles.schemeOptionText, isSelected && styles.schemeOptionTextSelected]}>
                                            {s}
                                        </Text>
                                        <Text style={styles.schemeOptionDesc}>
                                            {s === 'https'
                                                ? t('onboarding.address.httpsDesc')
                                                : t('onboarding.address.httpDesc')}
                                        </Text>
                                    </View>
                                </View>
                                {isSelected && <Check size={20} color={onDark.text} />}
                            </Touchable>
                        );
                    })}
                </BottomSheetView>
            </BottomSheetModal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: onDark.background,
    },
    mainContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.roomy,
        marginTop: spacing.xxxl,
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
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: onDark.muted,
        borderWidth: 1,
        borderColor: onDark.mutedText,
        paddingHorizontal: spacing.md,
        height: 50,
        marginBottom: spacing.controlGap,
    },
    schemeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.sm,
        borderRightWidth: 1,
        borderRightColor: onDark.border,
        height: '100%',
    },
    schemeText: {
        ...typography.compactRowTitle,
        color: onDark.text,
    },
    hostInput: {
        ...typography.body,
        flex: 1,
        color: onDark.text,
        marginLeft: spacing.controlGap,
    },
    hint: {
        ...typography.caption,
        color: onDark.mutedText,
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
    nextButtonText: {
        ...typography.sheetTitle,
        color: '#000',
    },
    backButton: {
        backgroundColor: onDark.border,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xs,
    },
    backButtonText: {
        ...typography.sheetTitle,
        color: onDark.text,
    },
    sheetBackground: {
        backgroundColor: onDark.muted,
    },
    sheetHandle: {
        backgroundColor: onDark.mutedText,
    },
    sheetContent: {
        paddingHorizontal: spacing.roomy,
        paddingTop: spacing.controlGap,
    },
    sheetTitle: {
        ...typography.sheetTitle,
        color: onDark.text,
        marginBottom: spacing.controlGap,
    },
    schemeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    schemeOptionSelected: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    schemeOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    schemeOptionText: {
        ...typography.rowTitle,
        color: onDark.subtext,
    },
    schemeOptionTextSelected: {
        color: onDark.text,
        fontWeight: '600',
    },
    schemeOptionDesc: {
        ...typography.caption,
        color: onDark.mutedText,
        marginTop: spacing.xxs,
    },
});
