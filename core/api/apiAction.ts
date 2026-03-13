import { api } from '@/services/api';

/**
 * Extrae el valor de una respuesta OkResult del backend.
 * Lanza un error si la respuesta contiene un error de red o si el backend
 * no devolvió un resultado exitoso.
 */
function extractValue<T>(response: { data?: any; error?: string }): T {
    if (response.error) {
        throw new Error(response.error);
    }
    if (!response.data) {
        throw new Error('Request failed: respuesta inesperada del servidor');
    }

    // the API wrapper may return two different envelope shapes:
    // 1. The fetch layer wraps everything in { data: T, message, statusCode }
    //    in which case the real payload sits at response.data.data
    // 2. The backend business layer uses the OkResult<T> pattern
    //    ( { ok: true, value: T } ) and the payload sits at .value.
    // We need to support both and even combinations of them.

    let payload = response.data;

    // unwrap the fetch layer if present
    if (payload && typeof payload === 'object' && 'data' in payload) {
        payload = payload.data;
    }

    // unwrap OkResult layer if present
    if (payload && typeof payload === 'object' && 'value' in payload) {
        return (payload.value as T);
    }

    // if we reach here, assume payload *is* the desired value
    return payload as T;
}

/**
 * Wrapper sobre el cliente fetch del proyecto que auto-extrae el valor de
 * la respuesta OkResult<T> del backend. Los llamadores reciben T directamente
 * y los errores se propagan como excepciones.
 */
export const apiAction = {
    async get<T>(endpoint: string, options: Record<string, any> = {}): Promise<T> {
        const response = await api.get<any>(endpoint, options);
        return extractValue<T>(response);
    },

    async post<T>(endpoint: string, data?: unknown, options: Record<string, any> = {}): Promise<T> {
        const response = await api.post<any>(endpoint, data, options);
        return extractValue<T>(response);
    },

    async put<T>(endpoint: string, data?: unknown, options: Record<string, any> = {}): Promise<T> {
        const response = await api.put<any>(endpoint, data, options);
        return extractValue<T>(response);
    },

    async patch<T>(endpoint: string, data?: unknown, options: Record<string, any> = {}): Promise<T> {
        const response = await api.patch<any>(endpoint, data, options);
        return extractValue<T>(response);
    },

    async delete<T>(endpoint: string, options: Record<string, any> = {}): Promise<T> {
        const response = await api.delete<any>(endpoint, options);
        return extractValue<T>(response);
    },

    async postFormData<T>(endpoint: string, formData: FormData, options: Record<string, any> = {}): Promise<T> {
        const response = await api.postFormData<any>(endpoint, formData, options);
        return extractValue<T>(response);
    },

    async patchFormData<T>(endpoint: string, formData: FormData, options: Record<string, any> = {}): Promise<T> {
        const response = await api.patchFormData<any>(endpoint, formData, options);
        return extractValue<T>(response);
    },
};
