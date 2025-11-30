import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ActiveDeliveryProvider } from '@/context/ActiveDeliveryContext';
import { DeliveryProvider } from '@/context/DeliveryContext';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomColors } from '@/constants/CustomColors';
import LoadingScreen from '@/components/LoadingScreen';
import { NotificationHandler } from '@/components/NotificationHandler';
import * as NavigationBar from 'expo-navigation-bar';

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

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Oculta los botones de Android
    NavigationBar.setVisibilityAsync('hidden');

    // Los muestra solo si el usuario desliza desde abajo
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// Protección de rutas
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

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

      // Los muestra solo si el usuario desliza desde abajo
      NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

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
