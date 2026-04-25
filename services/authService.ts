import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, IUserEntity, IRolesAllowedEntity, DeliveryPersonEntity } from '@/interfaces/auth';
import { api, extractDataFromResponse } from './api';
import { storeTokens, clearTokens } from './auth-fetch';

// Keys para almacenamiento
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_DATA_KEY = 'user_data';
export const USER_ROLES_KEY = 'user_roles';
export const CARRIER_DATA_KEY = 'carrier_data';

// Servicio de autenticación
export const authService = {
    login: async (email: string, password: string): Promise<{
        success: boolean;
        data?: LoginResponse;
        error?: string;
        details?: any;
    }> => {
        try {            
            const response = await api.post<LoginResponse>('auth/login-delivery', { email, password });

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error de autenticación',
                    details: response.details
                };
            }

            // Backend returns an OkResult serialized as { value: LoginResponse }
            const loginData = (response.data as unknown as { value: LoginResponse }).value;
            console.log('LoginData: ', loginData);
            
            if (!loginData) {
                console.log('Error parsing login response data structure from API:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: {
                        message: 'La estructura de datos recibida no es válida',
                        response: response
                    }
                };
            }

            const normalizedRoles = loginData.roles ?? loginData.user?.userRoles ?? [];
            const normalizedCarrier = loginData.carrier ?? null;

            // Guardar tokens usando el servicio centralizado
            await storeTokens(loginData.access_token, loginData.refresh_token);

            // Guardar datos del usuario y roles
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData.user));
            await AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(normalizedRoles));
            await AsyncStorage.setItem(CARRIER_DATA_KEY, JSON.stringify(normalizedCarrier));

            return {
                success: true,
                data: {
                    ...loginData,
                    user: loginData.user,
                    roles: normalizedRoles,
                    carrier: normalizedCarrier,
                }
            };
        } catch (error:any) {
            console.log('Login error:', error);
            return {
                success: false,
                error: 'Error en la conexión al servidor'
            };
        }
    },

    logout: async () => {
        // Eliminar todos los datos de autenticación
        await clearTokens();
        await AsyncStorage.multiRemove([
            USER_DATA_KEY,
            USER_ROLES_KEY,
            CARRIER_DATA_KEY
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
        carrier: DeliveryPersonEntity | null;
        token: string | null;
    }> => {
        try {
            const [userJson, rolesJson, carrierJson, token] = await Promise.all([
                AsyncStorage.getItem(USER_DATA_KEY),
                AsyncStorage.getItem(USER_ROLES_KEY),
                AsyncStorage.getItem(CARRIER_DATA_KEY),
                AsyncStorage.getItem(AUTH_TOKEN_KEY)
            ]);

            return {
                user: userJson ? JSON.parse(userJson) : null,
                roles: rolesJson ? JSON.parse(rolesJson) : null,
                carrier: carrierJson ? JSON.parse(carrierJson) : null,
                token
            };
        } catch (error:any) {
            console.log('Error getting auth data:', error);
            return { user: null, roles: null, carrier: null, token: null };
        }
    },

    fetchWhoami: async (): Promise<{
        success: boolean;
        data?: {
            user: IUserEntity;
            roles: IRolesAllowedEntity[];
            carrier: DeliveryPersonEntity | null;
        };
        error?: string;
        details?: any;
    }> => {
        try {
            const response = await api.get<IUserEntity>('auth/whoami');

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'No se pudo obtener la informacion del usuario',
                    details: response.details,
                };
            }

            const userData = extractDataFromResponse<IUserEntity>(response);

            if (!userData) {
                return {
                    success: false,
                    error: 'Respuesta invalida del endpoint whoami',
                    details: response,
                };
            }

            const normalizedRoles = userData.userRoles ?? [];
            const normalizedCarrier = userData.carrier ?? null;

            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            await AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(normalizedRoles));
            // Only persist carrier if the backend returned it to avoid overwriting a valid stored value
            if (normalizedCarrier !== null) {
                await AsyncStorage.setItem(CARRIER_DATA_KEY, JSON.stringify(normalizedCarrier));
            }

            // Resolve carrier: prefer fresh data from backend, fall back to stored value
            const storedCarrierJson = await AsyncStorage.getItem(CARRIER_DATA_KEY);
            const resolvedCarrier = normalizedCarrier ?? (storedCarrierJson ? JSON.parse(storedCarrierJson) : null);

            return {
                success: true,
                data: {
                    user: userData,
                    roles: normalizedRoles,
                    carrier: resolvedCarrier,
                },
            };
        } catch (error:any) {
            console.log('Error fetching whoami:', error);
            return {
                success: false,
                error: 'Error al sincronizar la informacion del usuario',
            };
        }
    },

    verifyEmailCode: async (email: string, code: string): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }> => {
        try {
            const response = await api.post('auth/verify-email', { email, code });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al verificar el código',
                    details: response.details
                };
            }

            return {
                success: true,
            };
        } catch (error:any) {
            console.log('Error verifying email code:', error);
            return {
                success: false,
                error: 'Error en la conexión al verificar el código'
            };
        }
    },

    resendVerificationCode: async (email: string): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }> => {
        try {
            const response = await api.post('auth/resend-verification-code', { email });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al reenviar el código',
                    details: response.details
                };
            }

            return {
                success: true,
            };
        } catch (error:any) {
            console.log('Error resending verification code:', error);
            return {
                success: false,
                error: 'Error en la conexión al reenviar el código'
            };
        }
    },

    changeInitialPassword: async (currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            const response = await api.patch('auth/change-initial-password', { currentPassword, newPassword, confirmNewPassword });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al cambiar la contraseña'
                };
            }

            return { success: true };
        } catch (error: any) {
            console.log('Error changing initial password:', error);
            return {
                success: false,
                error: 'Error en la conexión al cambiar la contraseña'
            };
        }
    }
};

