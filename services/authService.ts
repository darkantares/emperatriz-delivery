import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, IUserEntity, IRolesAllowedEntity, DeliveryPersonEntity } from '@/interfaces/auth';
import { api, extractDataFromResponse, getApiUrl } from './api';
import { storeRefreshToken, clearRefreshToken, getStoredRefreshToken } from './auth-fetch';
import { authStore } from '@/stores/authStore';
import { ApiEndpoints } from '../utils/api-endpoints';
import { validateJwtHasEnterprise, logJwtValidation } from '../utils/jwt-utils';
import { refreshAccessToken, RefreshResult } from './tokenManager';

// Keys para almacenamiento de datos de usuario (no sensibles)
const USER_DATA_KEY = 'user_data';
const USER_ROLES_KEY = 'user_roles';
const CARRIER_DATA_KEY = 'carrier_data';

// Servicio de autenticación
export const authService = {
    login: async (email: string, password: string): Promise<{
        success: boolean;
        data?: LoginResponse;
        error?: string;
        details?: any;
    }> => {
        try {
            const response = await api.post<LoginResponse>(getApiUrl(ApiEndpoints.AuthLoginDelivery), { email, password });

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error de autenticación',
                    details: response.details
                };
            }

            // Backend returns an OkResult serialized as { value: LoginResponse }
            const loginData = (response.data as unknown as { value: LoginResponse }).value;

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

            // Guardar access_token y csrf_token en memoria
            authStore.setAccessToken(loginData.access_token);
            if ((loginData as any).csrf_token) {
                authStore.setCsrfToken((loginData as any).csrf_token);
            }

            // Guardar refresh_token en SecureStore (encriptado)
            await storeRefreshToken(loginData.refresh_token);

            // Validar que el JWT tenga el campo enterprise (defensa contra bugs del backend)
            validateJwtHasEnterprise(loginData.access_token);
            logJwtValidation(loginData.access_token, 'login');

            // Guardar datos de usuario en AsyncStorage (no sensibles)
            await Promise.all([
                AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData.user)),
                AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(normalizedRoles)),
                AsyncStorage.setItem(CARRIER_DATA_KEY, JSON.stringify(normalizedCarrier)),
            ]);

            // Guardar en authStore también
            authStore.setUser(loginData.user);
            authStore.setCarrier(normalizedCarrier);
            authStore.setRoles(normalizedRoles);

            return {
                success: true,
                data: {
                    ...loginData,
                    user: loginData.user,
                    roles: normalizedRoles,
                    carrier: normalizedCarrier,
                }
            };
        } catch (error: any) {
            console.log('Login error:', error);
            return {
                success: false,
                error: 'Error en la conexión al servidor'
            };
        }
    },

    logout: async () => {
        // Limpiar tokens
        authStore.clearSession();
        await clearRefreshToken();

        // Limpiar datos de usuario de AsyncStorage
        await AsyncStorage.multiRemove([
            USER_DATA_KEY,
            USER_ROLES_KEY,
            CARRIER_DATA_KEY
        ]);
        return { success: true };
    },

    isAuthenticated: async (): Promise<boolean> => {
        // Verificar si hay refresh token en SecureStore
        const refreshToken = await getStoredRefreshToken();
        return Boolean(refreshToken);
    },

    getAuthData: async (): Promise<{
        user: IUserEntity | null;
        roles: IRolesAllowedEntity[] | null;
        carrier: DeliveryPersonEntity | null;
        token: string | null;
    }> => {
        try {
            // Primero intentar obtener del authStore (memoria)
            const memoryUser = authStore.getUser();
            if (memoryUser) {
                return {
                    user: authStore.getUser(),
                    roles: authStore.getRoles(),
                    carrier: authStore.getCarrier(),
                    token: authStore.getAccessToken(),
                };
            }

            // Fallback a AsyncStorage (para datos de usuario)
            const [userJson, rolesJson, carrierJson] = await Promise.all([
                AsyncStorage.getItem(USER_DATA_KEY),
                AsyncStorage.getItem(USER_ROLES_KEY),
                AsyncStorage.getItem(CARRIER_DATA_KEY),
            ]);

            return {
                user: userJson ? JSON.parse(userJson) : null,
                roles: rolesJson ? JSON.parse(rolesJson) : null,
                carrier: carrierJson ? JSON.parse(carrierJson) : null,
                token: authStore.getAccessToken(),
            };
        } catch (error: any) {
            console.log('Error getting auth data:', error);
            return { user: null, roles: null, carrier: null, token: null };
        }
    },

    /**
     * Refresca la sesión completa: tokens + datos del usuario.
     * Usa tokenManager que intenta WebSocket primero, HTTP como fallback.
     */
    refreshSession: async (): Promise<{
        success: boolean;
        data?: {
            user: IUserEntity;
            roles: IRolesAllowedEntity[];
            carrier: DeliveryPersonEntity | null;
        };
        error?: string;
    }> => {
        try {
            const result: RefreshResult | null = await refreshAccessToken();

            if (!result) {
                return { success: false, error: 'No se pudo refrescar el token' };
            }

            // Si el refresh vía WebSocket trajo datos del usuario, usarlos directamente
            if (result.user) {
                const userData = result.user;
                const normalizedRoles = userData.userRoles ?? [];
                const normalizedCarrier = result.carrier ?? userData.carrier ?? null;

                authStore.setUser(userData);
                authStore.setCarrier(normalizedCarrier);
                authStore.setRoles(normalizedRoles);

                await Promise.all([
                    AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
                    AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(normalizedRoles)),
                    AsyncStorage.setItem(CARRIER_DATA_KEY, JSON.stringify(normalizedCarrier)),
                ]);

                return {
                    success: true,
                    data: {
                        user: userData,
                        roles: normalizedRoles,
                        carrier: normalizedCarrier,
                    },
                };
            }

            // HTTP fallback: no trajo datos del usuario, usar fetchWhoami
            const whoami = await authService.fetchWhoami();
            if (whoami.success && whoami.data) {
                return {
                    success: true,
                    data: whoami.data,
                };
            }

            // Tokens se actualizaron pero no se pudieron obtener datos del usuario
            return { success: false, error: 'Token refrescado pero sin datos del usuario' };
        } catch (error: any) {
            console.log('Error refreshing session:', error);
            return {
                success: false,
                error: 'Error al refrescar la sesión',
            };
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
            const response = await api.get<IUserEntity>(getApiUrl(ApiEndpoints.AuthWhoami));

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

            // Actualizar authStore
            authStore.setUser(userData);
            authStore.setCarrier(normalizedCarrier);
            authStore.setRoles(normalizedRoles);

            // Actualizar AsyncStorage
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            await AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(normalizedRoles));
            if (normalizedCarrier !== null) {
                await AsyncStorage.setItem(CARRIER_DATA_KEY, JSON.stringify(normalizedCarrier));
            }

            // Resolve carrier
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
        } catch (error: any) {
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
            const response = await api.post(getApiUrl(ApiEndpoints.AuthVerifyEmail), { email, code });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al verificar el código',
                    details: response.details
                };
            }

            return { success: true };
        } catch (error: any) {
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
            const response = await api.post(getApiUrl(ApiEndpoints.AuthResendVerificationCode), { email });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al reenviar el código',
                    details: response.details
                };
            }

            return { success: true };
        } catch (error: any) {
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
            const response = await api.patch(getApiUrl(ApiEndpoints.AuthChangeInitialPassword), { currentPassword, newPassword, confirmNewPassword });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al cambiar la contraseña'
                };
            }

            const currentUser = authStore.getUser();
            if (currentUser) {
                authStore.setUser({ ...currentUser, mustChangePassword: false });
            }

            return { success: true };
        } catch (error: any) {
            console.log('Error changing initial password:', error);
            return {
                success: false,
                error: 'Error en la conexión al cambiar la contraseña'
            };
        }
    },

    sendForgotPassword: async (email: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            const response = await api.post(getApiUrl(ApiEndpoints.AuthForgotPasswordMobile), { email });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al enviar el correo de recuperación'
                };
            }

            return { success: true };
        } catch (error: any) {
            console.log('Error sending forgot password:', error);
            return {
                success: false,
                error: 'Error en la conexión al enviar el correo'
            };
        }
    },

    resetPassword: async (token: string, password: string, confirmPassword: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            const response = await api.patch(getApiUrl(ApiEndpoints.AuthResetPassword), { token, password, confirmPassword });

            if (response.error) {
                return {
                    success: false,
                    error: response.error || 'Error al restablecer la contraseña'
                };
            }

            return { success: true };
        } catch (error: any) {
            console.log('Error resetting password:', error);
            return {
                success: false,
                error: 'Error en la conexión al restablecer la contraseña'
            };
        }
    },
};
