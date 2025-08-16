import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, IUserEntity, IRolesAllowedEntity } from '@/interfaces/auth';
import { API_URL, api, extractDataFromResponse } from './api';

// Keys para almacenamiento
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const USER_ROLES_KEY = 'user_roles';

// Servicio de autenticación
export const authService = {
    login: async (email: string, password: string): Promise<{
        success: boolean;
        data?: LoginResponse;
        error?: string;
        details?: any;
    }> => {
        try {            
            // Prueba directa con fetch para asegurarnos de que estamos usando el endpoint correcto
            const directFetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            };
            
            try {
                const directResponse = await fetch(`${API_URL}/auth/login`, directFetchOptions);                
                if (directResponse.ok) {
                    const loginData = await directResponse.json();                    
                    if (!loginData) {
                        console.error('Error parsing login response data structure:', loginData);
                        return {
                            success: false,
                            error: 'Error al procesar la respuesta del servidor',
                            details: {
                                message: 'La estructura de datos recibida no es válida',
                                rawData: loginData
                            }
                        };
                    }
                    
                    // Guardar tokens                    
                    await AsyncStorage.setItem(AUTH_TOKEN_KEY, loginData.data.access_token);
                    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, loginData.data.refresh_token);

                    // // Guardar datos del usuario y roles
                    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData.data.user));
                    await AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(loginData.data.user.userRoles));
                    
                    return {
                        success: true,
                        data: loginData.data
                    };
                }
            } catch (directFetchError) {
                console.log('Error en fetch directo:', directFetchError);
            }
            
            // Si el fetch directo falló, intentamos con nuestro método de API
            const response = await api.post<LoginResponse>('auth/login-delivery', { email, password });

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error de autenticación',
                    details: response.details
                };
            }

            // Extraer los datos del LoginResponse de dentro de ResponseAPI
            const loginData = extractDataFromResponse<LoginResponse>(response);
            
            if (!loginData) {
                console.error('Error parsing login response data structure from API:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: {
                        message: 'La estructura de datos recibida no es válida',
                        response: response
                    }
                };
            }

            // Guardar tokens
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, loginData.access_token);
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, loginData.refresh_token);

            // Guardar datos del usuario y roles
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData.user));
            await AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(loginData.roles));

            return {
                success: true,
                data: loginData
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Error en la conexión al servidor'
            };
        }
    },

    logout: async () => {
        // Eliminar todos los datos de autenticación
        await AsyncStorage.multiRemove([
            AUTH_TOKEN_KEY,
            REFRESH_TOKEN_KEY,
            USER_DATA_KEY,
            USER_ROLES_KEY
        ]);
        return { success: true };
    },

    isAuthenticated: async () => {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        return !!token;
    },

    getAuthData: async (): Promise<{
        user: IUserEntity | null;
        roles: IRolesAllowedEntity[] | null;
        token: string | null;
    }> => {
        try {
            const [userJson, rolesJson, token] = await Promise.all([
                AsyncStorage.getItem(USER_DATA_KEY),
                AsyncStorage.getItem(USER_ROLES_KEY),
                AsyncStorage.getItem(AUTH_TOKEN_KEY)
            ]);

            return {
                user: userJson ? JSON.parse(userJson) : null,
                roles: rolesJson ? JSON.parse(rolesJson) : null,
                token
            };
        } catch (error) {
            console.error('Error getting auth data:', error);
            return { user: null, roles: null, token: null };
        }
    },

    refreshToken: async () => {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return { success: false };

        try {
            // Implementa la lógica para refrescar el token usando el refresh_token
            const response = await api.post<{ access_token: string; refresh_token?: string }>('/auth/refresh', { refresh_token: refreshToken });

            if (response.error || !response.data) {
                return { success: false };
            }

            // Extraer los datos del responseData usando nuestra función de utilidad
            const tokenData = extractDataFromResponse<{ access_token: string; refresh_token?: string }>(response);
            
            if (!tokenData) {
                console.error('Error parsing token refresh response:', response);
                return { success: false };
            }

            // Actualizar el token de acceso
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, tokenData.access_token);

            // Si el servidor devuelve un nuevo refresh token, actualizarlo también
            if (tokenData.refresh_token) {
                await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);
            }

            return { success: true };
        } catch (error) {
            console.error('Error refreshing token:', error);
            return { success: false };
        }
    }
};

// Exportar las constantes para que puedan ser utilizadas por otros servicios
export {
    AUTH_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_DATA_KEY,
    USER_ROLES_KEY
};
