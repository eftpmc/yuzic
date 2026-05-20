import { useNetInfo } from '@react-native-community/netinfo';

export type NetworkType = 'wifi' | 'cellular' | 'unknown';

export function useNetworkType(): NetworkType {
  const { type } = useNetInfo();
  if (type === 'wifi') return 'wifi';
  if (type === 'cellular') return 'cellular';
  return 'unknown';
}
