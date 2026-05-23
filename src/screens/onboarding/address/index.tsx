import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
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

type Scheme = 'https' | 'http';

export default function Address() {
    const { t } = useTranslation();
    const router = useRouter();
    const { type } = useLocalSearchParams<{ type: ServerType }>();

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

                        <View style={styles.inputRow}>
                            <TouchableOpacity
                                style={styles.schemeButton}
                                onPress={() => schemeSheetRef.current?.present()}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.schemeText}>{scheme}://</Text>
                                <ChevronDown size={14} color="#888" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.hostInput}
                                placeholder="your-server.com"
                                placeholderTextColor="#555"
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
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>{t('common.back')}</Text>
                        </TouchableOpacity>
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
                            <TouchableOpacity
                                key={s}
                                style={[styles.schemeOption, isSelected && styles.schemeOptionSelected]}
                                onPress={() => {
                                    setScheme(s);
                                    schemeSheetRef.current?.dismiss();
                                }}
                            >
                                <View style={styles.schemeOptionLeft}>
                                    {s === 'https'
                                      ? <Lock size={18} color={isSelected ? '#fff' : '#888'} style={{ marginRight: 10 }} />
                                      : <LockOpen size={18} color={isSelected ? '#fff' : '#888'} style={{ marginRight: 10 }} />
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
                                {isSelected && <Check size={20} color="#fff" />}
                            </TouchableOpacity>
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
        backgroundColor: '#000',
    },
    mainContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        marginTop: 40,
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
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#555',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 50,
        marginBottom: 10,
    },
    schemeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
        borderRightWidth: 1,
        borderRightColor: '#444',
        height: '100%',
    },
    schemeText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    hostInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        marginLeft: 10,
    },
    hint: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
    buttonContainer: {
        padding: 20,
        backgroundColor: '#000',
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    nextButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: '#333',
        paddingVertical: 15,
        borderRadius: 999,
        alignItems: 'center',
        width: '100%',
        marginBottom: 4,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    sheetBackground: {
        backgroundColor: '#222',
    },
    sheetHandle: {
        backgroundColor: '#555',
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 10,
    },
    schemeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    schemeOptionSelected: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    schemeOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    schemeOptionText: {
        fontSize: 16,
        color: '#aaa',
        fontWeight: '500',
    },
    schemeOptionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    schemeOptionDesc: {
        fontSize: 12,
        color: '#666',
        marginTop: 1,
    },
});
