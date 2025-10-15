import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ServerProvider } from '@/contexts/ServerContext';
import { JellyfinProvider } from "@/contexts/JellyfinContext";
import { NavidromeProvider } from "@/contexts/NavidromeContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { PlaylistProvider } from "@/contexts/PlaylistContext";
import { PlayingProvider } from "@/contexts/PlayingContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { LidarrProvider } from "@/contexts/LidarrContext";
import { DownloadProvider } from "@/contexts/DownloadContext";
import { AIProvider } from "@/contexts/AIContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from '@/utils/redux/store';
import { Alert, Platform, Dimensions, View } from 'react-native';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import RNRestart from 'react-native-restart';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const jsErrorHandler = (error, isFatal) => {
        if (isFatal) {
            Alert.alert(
                'Unexpected error occurred',
                `
Error: ${error.name} ${error.message}

We will need to restart the app.
      `,
                [
                    {
                        text: 'Restart',
                        onPress: () => {
                            RNRestart.Restart();
                        },
                    },
                ],
            );
        } else {
            console.log('Non-fatal JS error caught:', error);
        }
    };

    setJSExceptionHandler(jsErrorHandler, true); // `true` shows alert even in dev mode

    setNativeExceptionHandler((errorString) => {
        console.log('Native crash detected:', errorString);
        // Optionally send errorString to your backend or logging service
    }, false, true);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <SettingsProvider>
                        <NavidromeProvider>
                            <JellyfinProvider>
                                <ServerProvider>
                                    <LibraryProvider>
                                        <LidarrProvider>
                                            <PlaylistProvider>
                                                <DownloadProvider>
                                                    <PlayingProvider>
                                                        <AIProvider>
                                                            <SearchProvider>
                                                                <GestureHandlerRootView style={{ flex: 1 }}>
                                                                    <BottomSheetModalProvider>
                                                                        <Stack>
                                                                            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                                                                            <Stack.Screen name="(home)" options={{ headerShown: false }} />
                                                                            <Stack.Screen name="index" options={{ headerShown: false }} />
                                                                            <Stack.Screen name="+not-found" />
                                                                        </Stack>
                                                                        <StatusBar style="auto" />
                                                                        <Toasts
                                                                            defaultStyle={{
                                                                                view: {
                                                                                    backgroundColor: isDarkMode ? 'rgba(32,32,32,0.9)' : 'rgba(255,255,255,0.9)',
                                                                                    borderRadius: 10,
                                                                                    paddingVertical: 14,
                                                                                    paddingHorizontal: 20,
                                                                                    marginHorizontal: 16,
                                                                                    marginBottom: 24,
                                                                                    shadowColor: '#000',
                                                                                    shadowOpacity: 0.15,
                                                                                    shadowRadius: 10,
                                                                                    elevation: 4,
                                                                                },
                                                                                pressable: {
                                                                                    backgroundColor: 'transparent', // <-- ADD THIS
                                                                                },
                                                                                text: {
                                                                                    color: isDarkMode ? 'white' : 'black',
                                                                                    fontSize: 16,
                                                                                    fontWeight: '500',
                                                                                },
                                                                                indicator: {
                                                                                    marginRight: 12,
                                                                                },
                                                                            }}
                                                                        />
                                                                    </BottomSheetModalProvider>
                                                                </GestureHandlerRootView>
                                                            </SearchProvider>
                                                        </AIProvider>
                                                    </PlayingProvider>
                                                </DownloadProvider>
                                            </PlaylistProvider>
                                        </LidarrProvider>
                                    </LibraryProvider>
                                </ServerProvider>
                            </JellyfinProvider>
                        </NavidromeProvider>
                    </SettingsProvider>
                </PersistGate>
            </Provider>
        </ThemeProvider>
    );
}
