import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

export default function Index() {
  const activeServer = useSelector(selectActiveServer);
  const { colors } = useTheme();
  const hasAuthenticatedServer =
    !!activeServer?.isAuthenticated && !!activeServer?.serverUrl;

  if (hasAuthenticatedServer) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  if (!activeServer) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.secondary} />
    </View>
  );
}
