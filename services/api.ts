import { API_URLS } from '@/utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResponseAPI, FetchResponse } from '@/interfaces/global';
import { Platform } from 'react-native';

// Keys para almacenamiento
export const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Obtener la URL del API según el entorno (development o production)
// Obtiene la URL base sin /api
export const getBaseUrl = () => {
    try {
        let url;
        if (__DEV__) {
            url = Platform.OS === 'ios'
                ? API_URLS.DEV_IOS
                : API_URLS.DEV_ANDROID;
        } else {
            url = API_URLS.PROD;
        }
        return url.endsWith('/') ? url.slice(0, -1) : url;
    } catch (error) {
        console.log('Error al obtener URL base:', error);
        return API_URLS.DEFAULT;
    }
};

// Obtiene la URL base de la API
const getApiBaseUrl = () => {
    const baseUrl = getBaseUrl();  
    return `${baseUrl}/api`;
};

// URL base para todas las peticiones
export const API_URL = getApiBaseUrl();

// Opciones por defecto para fetch
const defaultOptions = {
    headers: {
        'Content-Type': 'application/json',
    },
};

// Función para añadir token de autorización a las opciones
const getAuthOptions = async (options: Record<string, any> = {}): Promise<RequestInit> => {
    try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            return options;
        }
        return {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        };
    } catch (error) {
        console.log('Error al obtener token de autenticación:', error);
        return options;
    }
};

// Interfaz para las opciones de la API
interface ApiOptions extends RequestInit {
    body?: string | FormData;
    method?: string;
}

// Función para manejar respuestas exitosas
const handleSuccessResponse = async <T>(response: Response): Promise<FetchResponse<T>> => {
    // Para endpoints que no devuelven JSON (como DELETE)
    if (response.status === 204) {
        return {
            data: {
                data: null as any,
                message: 'No content',
                statusCode: 204,
                success: true
            },
            status: response.status
        };
    }

    // Intentar parsear la respuesta como JSON
    try {
        // La respuesta viene como { data: T, message: string, statusCode: number, success: boolean }
        const responseData = await response.json() as ResponseAPI<T>;
        return { data: responseData, status: response.status };
    } catch (parseError) {
        console.log('Error parsing response as JSON:', parseError);
        return {
            error: 'Error al procesar la respuesta del servidor',
            status: response.status,
            parseError: true,
            data: {
                data: null as any,
                message: 'Error al procesar la respuesta del servidor',
                statusCode: response.status,
                success: false
            }
        };
    }
};

// Función para refrescar el token de autenticación
const refreshToken = async (): Promise<{ success: boolean }> => {
    try {
        const refreshTokenValue = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshTokenValue) {
            return { success: false };
        }

        // Endpoint para refrescar el token
        const refreshEndpoint = '/auth/refresh';
        const url = `${API_URL}${refreshEndpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshTokenValue })
        });

        if (!response.ok) {
            return { success: false };
        }

        const tokenData = await response.json();

        // Extraer datos del token refrescado
        const newTokenData = extractDataFromResponse<{ access_token: string; refresh_token?: string }>(tokenData);

        if (!newTokenData || !newTokenData.access_token) {
            console.log('La respuesta de refresh token no tiene el formato esperado');
            return { success: false };
        }

        // Guardar el nuevo token
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, newTokenData.access_token);

        // Si también recibimos un nuevo refresh token, guardarlo
        if (newTokenData.refresh_token) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newTokenData.refresh_token);
        }

        return { success: true };
    } catch (error) {
        console.log('Error al refrescar el token:', error);
        return { success: false };
    }
};

// Función genérica para hacer peticiones a la API
export const apiRequest = async <T>(endpoint: string, options: ApiOptions = {}): Promise<FetchResponse<T>> => {
    try {
        // Asegurarse de que endpoint comienza con /
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_URL}${formattedEndpoint}`;

        // Añadir token de autenticación a todas las solicitudes
        const authOptions = await getAuthOptions(options);

        // Para FormData, no incluir defaultOptions que contienen Content-Type
        const isFormData = options.body instanceof FormData;
        
        // Asegurarse de que las opciones tengan los headers correctos
        const requestOptions = isFormData 
            ? {
                // Para FormData, solo usar authOptions sin defaultOptions
                ...authOptions
            }
            : {
                // Para requests normales, usar defaultOptions + authOptions
                ...defaultOptions,
                ...authOptions,
                headers: {
                    ...defaultOptions.headers,
                    ...(authOptions.headers || {})
                }
            };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {

            // Si el error es 401 (Unauthorized), intentar refrescar el token
            if (response.status === 401) {
                const refreshResult = await refreshToken();

                if (refreshResult.success) {
                    // Reintento con el nuevo token
                    const newAuthOptions = await getAuthOptions(options);
                    const retryRequestOptions = isFormData 
                        ? { ...newAuthOptions }
                        : { ...defaultOptions, ...newAuthOptions };
                    
                    const retryResponse = await fetch(url, retryRequestOptions);

                    if (retryResponse.ok) {
                        return handleSuccessResponse<T>(retryResponse);
                    }
                } else {
                    console.log('No se pudo refrescar el token, usuario debe iniciar sesión nuevamente');
                }
            }

            try {
                // Intentar obtener detalles del error
                const errorData = await response.json();
                return {
                    error: errorData.message || `Error ${response.status}: ${response.statusText}`,
                    status: response.status,
                    details: errorData,
                    data: {
                        data: null as any,
                        message: errorData.message || `Error ${response.status}`,
                        statusCode: response.status,
                        success: false
                    }
                };
            } catch (parseError) {
                return {
                    error: `Error ${response.status}: ${response.statusText}`,
                    status: response.status,
                    data: {
                        data: null as any,
                        message: `Error ${response.status}: ${response.statusText}`,
                        statusCode: response.status,
                        success: false
                    }
                };
            }
        }

        // Procesar la respuesta exitosa
        return handleSuccessResponse<T>(response);
    } catch (error) {
        console.log('API Request Error:', error);
        return {
            error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`,
            status: 0,
            networkError: true,
            data: {
                data: null as any,
                message: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`,
                statusCode: 0,
                success: false
            }
        };
    }
};

// Métodos específicos para cada tipo de petición
export const api = {
    get: <T>(endpoint: string, options = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, data: any, options = {}) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        }),

    put: <T>(endpoint: string, data: any, options = {}) => apiRequest<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    patch: <T>(endpoint: string, data: any, options = {}) => {
        return apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            headers: {
                ...((options as any).headers || {}),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    },

    delete: <T>(endpoint: string, options = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

    postFormData: <T>(endpoint: string, formData: FormData, options = {}) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: formData
        }),
};

// Función para verificar la conectividad con el servidor
export const checkApiConnectivity = async () => {
    try {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const fetchPromise = fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await Promise.race([fetchPromise, timeout]);

        if (response instanceof Response) {
            return {
                success: true,
                status: response.status,
                message: 'Conexión exitosa al servidor'
            };
        }
        return {
            success: false,
            error: 'No se pudo conectar al servidor'
        };
    } catch (error) {
        console.log('API connectivity check error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al verificar la conectividad'
        };
    }
};

// Función de utilidad para validar y extraer los datos de una respuesta API
export const extractDataFromResponse = <T>(response: any): T | null => {
    if (!response) return null;

    // Caso 1: La respuesta ya es directamente del tipo esperado
    if (typeof response === 'object' && !('data' in response) && !('success' in response)) {
        return response as T;
    }

    // Caso 2: La respuesta es un objeto ResponseAPI<T>
    if (typeof response === 'object' && 'data' in response && 'success' in response) {
        return response.data as T;
    }

    // Caso 3: La respuesta es un objeto con FetchResponse<T>
    if (typeof response === 'object' && 'data' in response && typeof response.data === 'object') {
        if ('data' in response.data && 'success' in response.data) {
            // Es un FetchResponse con ResponseAPI anidado
            const innerData = response.data.data;

            // Caso 3.1: Verificar si hay otro nivel de anidación para datos paginados
            // Estructura específica de respuestas paginadas: {data: {data: {data: Array, total: number}}}
            if (
                innerData &&
                typeof innerData === 'object' &&
                'data' in innerData &&
                typeof innerData.data === 'object'
            ) {
                // Puede ser una respuesta paginada con estructura: {data: Array, total: number}
                if ('data' in innerData.data && 'total' in innerData.data) {
                    if (Array.isArray(innerData.data.data) &&
                        Object.getOwnPropertyNames(innerData.data).length === 2 &&
                        'data' in innerData.data && 'total' in innerData.data) {
                        return innerData.data as T;
                    } else {
                        // Solo devuelve el array de datos
                        return innerData.data.data as T;
                    }
                }
            }

            return innerData as T;
        } else {
            // El data no tiene la estructura ResponseAPI
            return response.data as T;
        }
    }

    console.warn('Formato de respuesta no reconocido:', response);
    return null;
};
