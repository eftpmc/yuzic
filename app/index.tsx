import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useServer } from '@/contexts/ServerContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { isAuthenticated } = useServer();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        if (isAuthenticated) {
            router.replace('/(home)')
        } else {
            router.replace('/(onboarding)');
        }
    }, [isMounted, isAuthenticated]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}