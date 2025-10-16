import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useServer } from '@/contexts/ServerContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated } = useServer();
  const { type, serverUrl } = useSelector((s: RootState) => s.server);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // 🧠 Wait until this component is mounted AND router is initialized
  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isMounted) return; // router may not be ready yet

    if (isAuthenticated && type && serverUrl) {
      console.log('[Router] Going to home');
      router.replace('/(home)');
    } else {
      console.log('[Router] Going to onboarding');
      router.replace('/(onboarding)');
    }
  }, [isMounted, isAuthenticated, type, serverUrl]);

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