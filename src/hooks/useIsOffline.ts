import { useNetInfo } from '@react-native-community/netinfo';

export function useIsOffline(): boolean {
  const netInfo = useNetInfo();
  return (
    netInfo.isConnected === false ||
    netInfo.isInternetReachable === false
  );
}
