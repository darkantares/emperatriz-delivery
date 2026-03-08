import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, AUTH_TOKEN_KEY } from '@/services/api';
import { findSchema } from './schemaRegistry';

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

// Attach the auth token to every outgoing request
zodClient.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (err) {
        console.log('[zodClient] Could not read auth token', err);
    }
    return config;
});

/**
 * Response interceptor: validates the response body against the registered
 * Zod schema for the called endpoint. Throws a clear error if the shape
 * diverges from what the schema declares.
 */
zodClient.interceptors.response.use((response) => {
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
});
