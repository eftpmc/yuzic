import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@backpackapp-io/react-native-toast';

const LimportSettingsView: React.FC = () => {
    const { themeColor, limportID, setLimportID } = useSettings();
    const router = useRouter();
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [tempID, setTempID] = useState(limportID);

    useEffect(() => {
        setTempID(limportID);
    }, [limportID]);

    const canConfirm = tempID.trim() !== '' && tempID !== limportID;

    const handleConfirm = () => {
        setLimportID(tempID.trim());
        toast.success('Limport ID updated');
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Limport
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.label, isDarkMode && styles.labelDark]}>Limport ID</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            value={tempID}
                            onChangeText={setTempID}
                            placeholder="Enter ID"
                            placeholderTextColor="#888"
                            style={[
                                styles.input,
                                isDarkMode && styles.inputDark,
                                { flex: 1, marginRight: 8 },
                            ]}
                        />
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                { backgroundColor: canConfirm ? themeColor : '#ccc' },
                            ]}
                            onPress={handleConfirm}
                            disabled={!canConfirm}
                        >
                            <Ionicons name="checkmark" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default LimportSettingsView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
    headerDark: { backgroundColor: '#000', borderBottomColor: '#222' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'center' },
    headerTitleDark: { color: '#fff' },
    backButton: {
        position: 'absolute',
        left: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { marginBottom: 24 },
    sectionDark: { backgroundColor: '#111', padding: 16, borderRadius: 10 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
    labelDark: { color: '#fff' },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        color: '#000',
        backgroundColor: '#fff',
    },
    inputDark: {
        borderColor: '#444',
        backgroundColor: '#1a1a1a',
        color: '#fff',
    },
    confirmButton: {
        width: 38,
        height: 38,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});