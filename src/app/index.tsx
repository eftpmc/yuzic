import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useServer } from '@/contexts/ServerContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useServer();
  const { type, serverUrl } = useSelector((s: RootState) => s.server);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (isAuthenticated && type && serverUrl) {
      router.replace('/(home)');
    } else {
      router.replace('/(onboarding)');
    }
  }, [isMounted, isLoading, isAuthenticated, type, serverUrl]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      }}
    >
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}