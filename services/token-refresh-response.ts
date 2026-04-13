import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_TOKEN_KEY } from './authService';

const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Captura los nuevos tokens devueltos por el backend en los headers de respuesta
 * El backend refresca automáticamente el token en el middleware y lo devuelve en headers
 */
export const captureTokensFromHeaders = async (response: Response) => {
  try {
    const newAccessToken = response.headers.get('x-new-access-token');
    const newRefreshToken = response.headers.get('x-new-refresh-token');

    if (newAccessToken) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
    }
    if (newRefreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    }
  } catch (error: any) {
    console.error('[captureTokensFromHeaders] Error saving tokens:', error);
  }
};
