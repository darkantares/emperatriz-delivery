import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Image, ActivityIndicator, StyleSheet, Platform } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ActiveDeliveryProvider } from '@/context/ActiveDeliveryContext';
import { DeliveryProvider } from '@/context/DeliveryContext';
import { useDelivery } from '@/context/DeliveryContext';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomColors } from '@/constants/CustomColors';
import LoadingScreen from '@/components/LoadingScreen';
import { NotificationHandler } from '@/components/NotificationHandler';
import * as NavigationBar from 'expo-navigation-bar';
import { api, checkApiConnectivity } from '@/services/api';
import { setupDeepLinkListeners } from '@/utils/deepLinkHandler';
import Constants from 'expo-constants';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [showBootLoader, setShowBootLoader] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setShowBootLoader(true);
      setTimeout(() => setShowBootLoader(false), 1200);
    }
  }, [loaded]);

  useEffect(() => {
    // Oculta los botones de Android
    NavigationBar.setVisibilityAsync('hidden');

    // Los muestra solo si el usuario desliza desde abajo

  }, []);

  if (!loaded) {
    return null;
  }

  return showBootLoader ? (
    <View style={styles.splashContainer}>
      <Image source={require('../assets/images/screen.png')} style={styles.splashImage} resizeMode="contain" />
      <ActivityIndicator size="large" color="#ffffff" style={styles.splashSpinner} />
    </View>
  ) : (
    <RootLayoutNav />
  );
}

// Protección de rutas
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { fetchDeliveries } = useDelivery();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const lastOnline = useRef<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredPushUsersRef = useRef<Set<number>>(new Set());
  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const isLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !isLoginScreen) {
      // Si el usuario no está autenticado y no está en la pantalla de login, redirigir al login
      router.replace('/login');
    } else if (isAuthenticated && isLoginScreen) {
      // Si el usuario está autenticado y está en la pantalla de login, redirigir a la app
      router.replace('/(tabs)');
    }
  }, [segments, isAuthenticated, isLoading, navigationState?.key]);

  useEffect(() => {
      // Oculta los botones de Android
      NavigationBar.setVisibilityAsync('hidden');
  }, []);
  
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      try {
        const result = await checkApiConnectivity();
        const isOnline = !!result?.success;
        if (lastOnline.current === false && isOnline) {
          await fetchDeliveries(true);
        }
        lastOnline.current = isOnline;
      } catch {}
    }, 15000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (isExpoGo) {
      console.log('[Push] Skipping push token registration in Expo Go');
      return;
    }
    if (registeredPushUsersRef.current.has(user.id)) return;

    const registerPushToken = async () => {
      try {
        const Notifications = await import('expo-notifications');

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        const permissions = await Notifications.getPermissionsAsync();
        let finalStatus = permissions.status;

        if (finalStatus !== 'granted') {
          const requestResult = await Notifications.requestPermissionsAsync();
          finalStatus = requestResult.status;
        }

        if (finalStatus !== 'granted') {
          console.log('[Push] Permission not granted');
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId;

        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );

        const registerResult = await api.post('/notifications/token', {
          userId: user.id,
          token: tokenResult.data,
        });

        if (registerResult.error) {
          throw new Error(registerResult.error);
        }

        registeredPushUsersRef.current.add(user.id);
        console.log('[Push] Token registered for user', user.id, registerResult.data?.data);
      } catch (error) {
        console.log('[Push] Error registering token:', error);
      }
    };

    registerPushToken();
  }, [isAuthenticated, isExpoGo, user?.id]);

  useEffect(() => {
    if (isExpoGo) {
      return;
    }

    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    const setupListeners = async () => {
      try {
        const Notifications = await import('expo-notifications');

        receivedSubscription = Notifications.addNotificationReceivedListener(
          (notification) => {
            console.log('[Push] Notification received:', notification.request.content);
          },
        );

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('[Push] Notification response:', response);
          });
      } catch (error) {
        console.log('[Push] Error setting notification listeners:', error);
      }
    };

    setupListeners();

    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [isExpoGo]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Setup deep link listeners for handling shared locations
    console.log('[App] Setting up deep link listeners');
    const cleanup = setupDeepLinkListeners();
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ActiveDeliveryProvider>
          <DeliveryProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <ProtectedRouteGuard>
                <Stack screenOptions={{ 
                  headerStyle: { 
                    backgroundColor: CustomColors.backgroundDark
                  },
                  headerTintColor: CustomColors.textLight
                }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />            
                </Stack>
                
                <NotificationHandler />
              </ProtectedRouteGuard>
            </ThemeProvider>
          </DeliveryProvider>
        </ActiveDeliveryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#1A1125',
    alignItems: 'center',
    justifyContent: 'center'
  },
  splashImage: {
    width: '72%',
    height: undefined,
    aspectRatio: 1,
    marginBottom: 24
  },
  splashSpinner: {
    marginTop: 8
  }
});
