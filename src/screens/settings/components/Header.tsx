import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
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
    const { colors } = useTheme();

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
                style={styles.backButton}
            >
                <ChevronLeft
                    size={24}
                    color={colors.secondary}
                />
            </TouchableOpacity>

            <View pointerEvents="none" style={styles.titleWrapper}>
                <Text
                    style={[styles.title, { color: colors.secondary }]}
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
        maxWidth: '60%',
    },
    rightSlot: {
        minWidth: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
