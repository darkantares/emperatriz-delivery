import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, AUTH_TOKEN_KEY } from '@/services/api';
import { findSchema } from './schemaRegistry';

const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Axios client with automatic Zod response validation via interceptor.
 *
 * This client coexists alongside the fetch-based `api` in services/api.ts.
 * Existing code is not affected — use this for new code and migrate gradually.
 *
 * Example:
 *   const { data } = await zodClient.get('/delivery-assignments/by-driver/');
 */
export const zodClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach the auth token and refresh token to every outgoing request
zodClient.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (refreshToken) {
            config.headers['x-refresh-token'] = refreshToken;
        }
    } catch (err: any) {
        console.log('[zodClient] Could not read auth tokens', err);
    }
    return config;
});

/**
 * Response interceptor: 
 * 1. Captures new tokens from backend (X-New-Access-Token, X-New-Refresh-Token)
 * 2. Validates the response body against registered Zod schema
 */
zodClient.interceptors.response.use(
    async (response) => {
        // Capture new tokens if backend refreshed them
        try {
            const newAccessToken = response.headers['x-new-access-token'];
            const newRefreshToken = response.headers['x-new-refresh-token'];

            if (newAccessToken) {
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
            }
            if (newRefreshToken) {
                await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
            }
        } catch (err: any) {
            console.log('[zodClient] Could not save new tokens', err);
        }

        // Validate response against Zod schema
        const url = response.config.url ?? '';
        const schema = findSchema(url);

        if (schema) {
            const result = schema.safeParse(response.data);

            if (!result.success) {
                console.error('[zodClient] Invalid API response for', url, result.error);
                throw new Error('Invalid API response structure');
            }

            response.data = result.data;
        }

        return response;
    },
    (error) => {
        // Propagate errors
        return Promise.reject(error);
    }
);
