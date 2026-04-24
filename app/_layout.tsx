import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';

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
import { useBatteryOptimizationCheck } from '@/core/hooks/useBatteryOptimizationCheck';
import { useFCMPushNotifications } from '@/core/hooks/useFCMPushNotifications';
import { useOTAUpdates } from '@/core/hooks/useOTAUpdates';
import ForceUpdateScreen from '@/components/ForceUpdateScreen';

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
    NavigationBar.setVisibilityAsync('hidden').catch(() => {
    });

  }, []);

  const { isForceUpdateRequired, status: updateStatus, retry } = useOTAUpdates();

  if (!loaded) {
    return null;
  }

  if (isForceUpdateRequired) {
    return <ForceUpdateScreen status={updateStatus} onRetry={retry} />;
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

  useFCMPushNotifications(user?.id);

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const isLoginScreen = segments[0] === 'login';
    const isVerifyScreen = segments[0] === 'verify-email';

    if (!isAuthenticated && !isLoginScreen && !isVerifyScreen) {
      // No autenticado → login
      router.replace('/login');
    } else if (isAuthenticated && !user?.isEmailVerified && !isVerifyScreen) {
      // Autenticado pero sin verificar email → pantalla de verificación
      router.replace('/verify-email');
    } else if (isAuthenticated && user?.isEmailVerified && (isLoginScreen || isVerifyScreen)) {
      // Autenticado y verificado → app
      router.replace('/(tabs)');
    }
  }, [segments, isAuthenticated, isLoading, navigationState?.key, user?.isEmailVerified]);

  useEffect(() => {
    // Oculta los botones de Android
    NavigationBar.setVisibilityAsync('hidden').catch(() => {
      // Silently ignore if activity is no longer available
    });
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
      } catch { }
    }, 15000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useBatteryOptimizationCheck();

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
