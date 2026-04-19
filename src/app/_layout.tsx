import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PlayingProvider } from '@/contexts/PlayingContext';
import { SearchProvider } from '@/contexts/SearchContext';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      gcTime: Infinity,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
})

function AppShell() {
  const { resolved, isDarkMode, colors } = useTheme();
  const language = useSelector(selectLanguage);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      <DownloadProvider>
        <PlayingProvider>
<SearchProvider>
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
          </SearchProvider>
        </PlayingProvider>
      </DownloadProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('@assets/fonts/SpaceMono-Regular.ttf'),
  });

  SplashScreen.setOptions({
    duration: 1000,
    fade: true,
  });

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
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <LibraryProvider>
            <AppShell />
          </LibraryProvider>
        </PersistGate>
      </Provider>
    </PersistQueryClientProvider>
  );
}