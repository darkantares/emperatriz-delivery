import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const getStoredTokens = async () => {
  try {
    return {
      accessToken: await AsyncStorage.getItem(AUTH_TOKEN_KEY),
      refreshToken: await AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    };
  } catch (error) {
    console.error('[authFetch] Error getting stored tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
};

export const hasStoredAuthTokens = async (): Promise<boolean> => {
  const { accessToken, refreshToken } = await getStoredTokens();
  return Boolean(accessToken || refreshToken);
};

export const storeTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('[authFetch] Error storing tokens:', error);
  }
};

export const clearTokens = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[authFetch] Error clearing tokens:', error);
  }
};

export { getStoredTokens };
