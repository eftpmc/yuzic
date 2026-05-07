import { useNetInfo } from '@react-native-community/netinfo';
import { QueryKey, useQuery } from '@tanstack/react-query';

export function hasArrayData<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

export function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function selectOfflineFirstData<T>({
  queryData,
  fallbackData,
  hasFallbackData,
  preferFallbackWhenQueryEmpty = false,
}: {
  queryData: T | undefined;
  fallbackData: T;
  hasFallbackData: (value: T) => boolean;
  preferFallbackWhenQueryEmpty?: boolean;
}): T {
  if (queryData === undefined) return fallbackData;
  if (
    preferFallbackWhenQueryEmpty &&
    !hasFallbackData(queryData) &&
    hasFallbackData(fallbackData)
  ) {
    return fallbackData;
  }
  return queryData;
}

export function useOfflineFirstQuery<T>({
  queryKey,
  queryFn,
  enabled,
  staleTime,
  fallbackData,
  hasFallbackData,
  preferFallbackWhenQueryEmpty,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled: boolean;
  staleTime: number;
  fallbackData: T;
  hasFallbackData: (value: T) => boolean;
  preferFallbackWhenQueryEmpty?: boolean;
}) {
  const netInfo = useNetInfo();
  const isOffline =
    netInfo.isConnected === false ||
    netInfo.isInternetReachable === false;
  const hasFallback = hasFallbackData(fallbackData);

  const query = useQuery<T, Error>({
    queryKey,
    queryFn,
    enabled: enabled && !isOffline,
    staleTime,
    networkMode: 'offlineFirst',
    meta: {
      suppressGlobalErrorToast: hasFallback,
    },
  });

  const data = selectOfflineFirstData({
    queryData: query.data,
    fallbackData,
    hasFallbackData,
    preferFallbackWhenQueryEmpty,
  });

  return {
    data,
    isLoading: query.isLoading && !hasFallback,
    error: hasFallback ? null : query.error ?? null,
    isOffline,
    query,
  };
}
