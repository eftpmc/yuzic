import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

export default function Index() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const activeServer = useSelector(selectActiveServer);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (
      activeServer &&
      activeServer.isAuthenticated &&
      activeServer.serverUrl
    ) {
      router.replace('/');
    } else {
      router.replace('/(onboarding)');
    }
  }, [isMounted, activeServer]);

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