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
    if (!response.data || response.data.value === undefined) {
        throw new Error('Request failed: respuesta inesperada del servidor');
    }
    return response.data.value as T;
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
};
