import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';

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
    const { t } = useTranslation();
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
            <Touchable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.common.back')}
                onPress={handleBack}
                style={styles.backButton}
            >
                <ChevronLeft
                    size={iconSize.header}
                    color={colors.secondary}
                />
            </Touchable>

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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        padding: spacing.tight,
    },
    titleWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    title: {
        ...typography.navigationTitle,
        fontWeight: '700',
        maxWidth: '60%',
    },
    rightSlot: {
        minWidth: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
