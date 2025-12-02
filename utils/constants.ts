import Constants from 'expo-constants';

// Acceder a las variables definidas en app.json
export const API_URLS = {
    PROD: Constants.expoConfig?.extra?.apiUrl?.EXPO_PUBLIC_API_URL_PROD || '',
    DEV_IOS: Constants.expoConfig?.extra?.apiUrl?.EXPO_PUBLIC_API_URL_DEV_IOS || '',
    DEV_ANDROID: Constants.expoConfig?.extra?.apiUrl?.EXPO_PUBLIC_API_URL_DEV_ANDROID || '',
    DEFAULT: Constants.expoConfig?.extra?.apiUrl?.EXPO_PUBLIC_API_URL_DEFAULT || '',
};