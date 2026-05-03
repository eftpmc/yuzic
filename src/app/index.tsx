import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

export default function Index() {
  const activeServer = useSelector(selectActiveServer);
  const hasAuthenticatedServer =
    !!activeServer?.isAuthenticated && !!activeServer?.serverUrl;

  if (hasAuthenticatedServer) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  if (!activeServer) {
    return <Redirect href="/(onboarding)" />;
  }

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
