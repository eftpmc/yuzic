import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

type HeaderProps = {
    title: string;
    onBackPress?: () => void;
    rightAction?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({
    title,
    onBackPress,
    rightAction,
}) => {
    const router = useRouter();
    const { isDarkMode } = useTheme();

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
            >
                <Ionicons
                    name="chevron-back"
                    size={24}
                    color={isDarkMode ? '#fff' : '#000'}
                />
            </TouchableOpacity>

            <View pointerEvents="none" style={styles.titleWrapper}>
                <Text
                    style={[
                        styles.title,
                        isDarkMode && styles.titleDark,
                    ]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>

            <View style={styles.rightSlot}>
                {rightAction ?? null}
            </View>
        </View>
    );
};

export default Header;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#D1D1D6',
    },
    containerDark: {
        borderBottomColor: '#1C1C1E',
    },
    backButton: {
        padding: 6,
    },
    titleWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        maxWidth: '60%',
    },
    titleDark: {
        color: '#fff',
    },
    rightSlot: {
        minWidth: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
