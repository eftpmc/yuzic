import { useNetInfo } from '@react-native-community/netinfo';
import { QueryKey, useQuery } from '@tanstack/react-query';
import { useServerUnreachable } from '@/features/connectivity/serverReachability';

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
  // Circuit breaker: once the server is known-unreachable (device online but
  // e.g. the VPN to it is down), stop issuing queries that would each hang
  // until their own timeout. ServerReachabilityWatcher clears the flag on the
  // first successful ping and invalidates, so these re-enable and refetch.
  const serverUnreachable = useServerUnreachable();
  const hasFallback = hasFallbackData(fallbackData);

  const query = useQuery<T, Error>({
    queryKey,
    queryFn,
    enabled: enabled && !isOffline && !serverUnreachable,
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

  // Rendering the fallback because the server couldn't be asked (offline,
  // unreachable, or the fetch failed) — as opposed to rendering server data.
  // Screens whose fallback is thinner than the real thing surface this so
  // partial data doesn't read as a bug.
  const degraded =
    query.data === undefined &&
    hasFallback &&
    (isOffline || serverUnreachable || query.isError);

  return {
    data,
    isLoading: query.isLoading && !hasFallback && !isOffline && !serverUnreachable,
    error: hasFallback ? null : query.error ?? null,
    isOffline,
    serverUnreachable,
    degraded,
    query,
  };
}
