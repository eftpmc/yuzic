import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.backButton}
            >
                <Ionicons
                    name="chevron-back"
                    size={24}
                    color={isDarkMode ? '#fff' : '#000'}
                />
            </TouchableOpacity>

            <Text
                style={[
                    styles.title,
                    isDarkMode && styles.titleDark,
                ]}
                numberOfLines={1}
            >
                {title}
            </Text>

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
        paddingVertical: 8,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginLeft: 8,
    },
    titleDark: {
        color: '#fff',
    },
    rightSlot: {
        minWidth: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});