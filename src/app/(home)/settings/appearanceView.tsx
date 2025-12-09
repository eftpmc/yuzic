import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Appearance,
    StyleSheet,
    Platform,
} from 'react-native';
import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'expo-router';

const AppearanceView: React.FC = () => {
    const router = useRouter();
    const { themeColor, setThemeColor, gridColumns, setGridColumns } = useSettings();
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const colorScheme = Appearance.getColorScheme();
    const isDarkMode = colorScheme === 'dark';

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark, Platform.OS === 'android' && { paddingTop: 24 }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Appearance
                </Text>
            </View>


            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, isDarkMode && styles.sectionDark]}>
                    <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                        Customize the primary color of your app
                    </Text>
                    <TouchableOpacity
                        style={[styles.optionButton, isDarkMode && styles.optionButtonDark]}
                        onPress={() => setIsPickerVisible(!isPickerVisible)}
                    >
                        <View style={styles.leftGroup}>
                            <View
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    backgroundColor: themeColor,
                                    marginRight: 12,
                                }}
                            />
                            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                                Change Theme Color
                            </Text>
                        </View>
                        <MaterialIcons
                            name={isPickerVisible ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={isDarkMode ? '#ccc' : '#666'}
                        />
                    </TouchableOpacity>

                    {isPickerVisible && (
                        <View style={{ paddingTop: 16 }}>
                            <ColorPicker
                                value={themeColor}
                                onComplete={(color) => setThemeColor(color.hex)}
                                style={{ height: 240, width: '100%' }}
                            >
                                <Panel1 />
                                <HueSlider />
                            </ColorPicker>
                        </View>
                    )}
                </View>

                <View style={[styles.section, isDarkMode && styles.sectionDark, { marginTop: 24 }]}>
                    <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                        Set how many columns are shown in grid view
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                        {[2, 3, 4].map((cols) => (
                            <TouchableOpacity
                                key={cols}
                                onPress={() => setGridColumns(cols)}
                                style={{
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    marginRight: 12,
                                    backgroundColor: gridColumns === cols ? themeColor : isDarkMode ? '#222' : '#eee',
                                    borderColor: isDarkMode ? '#444' : '#ccc',
                                    borderWidth: 1,
                                }}
                            >
                                <Text style={{
                                    color: gridColumns === cols
                                        ? (isDarkMode && parseInt(themeColor.slice(1), 16) > 0xaaaaaa ? '#000' : '#fff')
                                        : isDarkMode ? '#ccc' : '#000',
                                    fontWeight: gridColumns === cols ? '600' : '400'
                                }}>
                                    {cols} Columns
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AppearanceView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    containerDark: { backgroundColor: '#000' },
        header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 6,
    },
    headerDark: { 
        // No background, keep it transparent like OpenAI
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
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { marginBottom: 24 },
    sectionDark: {
        backgroundColor: '#111',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    rowText: { fontSize: 16, color: '#000' },
    rowTextDark: { color: '#fff' },
    infoText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 12,
    },
    infoTextDark: {
        color: '#aaa',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f1f1',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    optionButtonDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});