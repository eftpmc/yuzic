import React, { forwardRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Appearance,
} from 'react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type SortOrder = 'title' | 'recent' | 'userplays';

interface SortBottomSheetProps {
    sortOrder: SortOrder;
    onSelect: (value: SortOrder) => void;
}

const sortOptions = [
    { value: 'title', label: 'Alphabetical', icon: 'text-outline' },
    { value: 'recent', label: 'Most Recent', icon: 'time-outline' },
    { value: 'userplays', label: 'Most Played', icon: 'flame-outline' },
] as const;

const SortBottomSheet = forwardRef<BottomSheet, SortBottomSheetProps>(
    ({ sortOrder, onSelect }, ref) => {
        const themeColor = useSelector(selectThemeColor);
        const { isDarkMode } = useTheme();

        return (
            <BottomSheet
                ref={ref}
                height={300}
                hasDraggableIcon
                sheetBackgroundColor={isDarkMode ? '#222' : '#f9f9f9'}
            >
                <View style={styles.sheetContainer}>
                    <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTitleDark]}>
                        Sort by
                    </Text>

                    {sortOptions.map(option => {
                        const isSelected = sortOrder === option.value;

                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.pickerItem,
                                    {
                                        backgroundColor: isSelected
                                            ? themeColor + '22'
                                            : 'transparent',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                    },
                                ]}
                                onPress={() => onSelect(option.value)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons
                                        name={option.icon}
                                        size={18}
                                        color={
                                            isSelected
                                                ? themeColor
                                                : isDarkMode
                                                    ? '#ccc'
                                                    : '#555'
                                        }
                                        style={{ marginRight: 10 }}
                                    />
                                    <Text
                                        style={[
                                            styles.pickerText,
                                            isDarkMode && styles.pickerTextDark,
                                            { fontWeight: isSelected ? '600' : '400' },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </View>

                                {isSelected && (
                                    <Ionicons
                                        name="checkmark"
                                        size={20}
                                        color={themeColor}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => (ref as any)?.current?.close()}
                    >
                        <Text style={[styles.cancelText, isDarkMode && styles.cancelTextDark]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>
        );
    }
);

export default SortBottomSheet;

const styles = StyleSheet.create({
    sheetContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    sheetTitleDark: {
        color: '#fff',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    pickerText: {
        fontSize: 16,
        color: '#333',
    },
    pickerTextDark: {
        color: '#fff',
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 15,
    },
    cancelText: {
        fontSize: 16,
        color: '#333',
    },
    cancelTextDark: {
        color: '#aaa',
    },
});