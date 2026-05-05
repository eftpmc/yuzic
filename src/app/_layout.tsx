import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';

import { QueryClient, QueryCache, onlineManager } from '@tanstack/react-query';
import { Toasts, toast } from '@backpackapp-io/react-native-toast';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PlayingProvider } from '@/contexts/PlayingContext';
import { LibraryProvider } from '@/contexts/LibraryContext';
import { DownloadProvider } from '@/contexts/DownloadContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from '@/utils/redux/store';
import { Alert } from 'react-native';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import RNRestart from 'react-native-restart';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { selectLanguage } from '@/utils/redux/selectors/settingsSelectors';
import i18n from '@/i18n';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryStorage } from '@/utils/mmkvStorage';
import NetInfo from '@react-native-community/netinfo';
import OfflineMutationReplayer from '@/offline/OfflineMutationReplayer';

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected)
  })
})

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (_error, query) => {
      // Only show a toast when a query has no cached data — silent background
      // refreshes shouldn't interrupt the user if stale data is still visible.
      if (query.state.data === undefined) {
        toast.error(i18n.t('common.libraryLoadFailed'));
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24 * 30,
    },
  },
});

const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

const asyncStoragePersister = createAsyncStoragePersister({
  storage: queryStorage,
})

const OFFLINE_TOAST_ID = 'offline-banner';

function AppShell() {
  const { resolved, isDarkMode } = useTheme();
  const language = useSelector(selectLanguage);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        toast(i18n.t('common.offline.noConnection'), {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
        });
      } else {
        toast.dismiss(OFFLINE_TOAST_ID);
      }
    });
    return unsub;
  }, []);

  return (
    <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      <DownloadProvider>
        <PlayingProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ErrorBoundary>
              <BottomSheetModalProvider>
                <Stack>
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen name="(home)" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                </Stack>

                <StatusBar style={isDarkMode ? 'light' : 'dark'} />

                <Toasts
                  defaultStyle={{
                    view: {
                      backgroundColor: isDarkMode
                        ? 'rgba(32,32,32,0.9)'
                        : 'rgba(255,255,255,0.9)',
                      borderRadius: 10,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 10,
                      elevation: 4,
                    },
                    pressable: {
                      backgroundColor: 'transparent',
                    },
                    text: {
                      color: isDarkMode ? '#fff' : '#000',
                      fontSize: 16,
                      fontWeight: '500',
                    },
                    indicator: {
                      marginRight: 12,
                    },
                  }}
                />
              </BottomSheetModalProvider>
              </ErrorBoundary>
            </GestureHandlerRootView>
        </PlayingProvider>
      </DownloadProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('@assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    SplashScreen.setOptions({ duration: 1000, fade: true });
  }, []);

  useEffect(() => {
    const jsErrorHandler = (error: { name: string; message: string }, isFatal: boolean) => {
      if (isFatal) {
        Alert.alert(
          i18n.t('common.error.unexpected'),
          i18n.t('common.error.details', { name: error.name, message: error.message }),
          [{ text: i18n.t('common.error.restart'), onPress: () => RNRestart.Restart() }]
        );
      }
    };

    setJSExceptionHandler(jsErrorHandler, true);
    setNativeExceptionHandler(() => { }, false, true);
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: QUERY_CACHE_MAX_AGE,
      }}
    >
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <LibraryProvider>
            <OfflineMutationReplayer />
            <AppShell />
          </LibraryProvider>
        </PersistGate>
      </Provider>
    </PersistQueryClientProvider>
  );
}
