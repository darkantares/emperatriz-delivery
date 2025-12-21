import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendUrls } from '@/utils/enum';

/**
 * Interfaces para OSRM
 */
export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface OsrmRouteParams {
    origin: Coordinates;
    destination: Coordinates;
    steps?: boolean;
    geometries?: string;
    overview?: string;
    alternatives?: boolean;
    continue_straight?: boolean;
}

export interface OsrmRouteResult {
    code: string;
    routes: any[];
    waypoints: any[];
}

/**
 * Servicio para gestionar las operaciones relacionadas con rutas OSRM
 */
export const osrmService = {
    
    /**
     * Obtiene una ruta OSRM entre dos puntos
     * @param params Parámetros de la ruta (origen, destino y opciones)
     * @returns Ruta calculada por OSRM
     */
    getRoute: async (params: OsrmRouteParams): Promise<{
        success: boolean;
        data?: OsrmRouteResult;
        error?: string;
        details?: any;
    }> => {
        // Verificar token antes de hacer la solicitud
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
            return {
                success: false,
                error: 'No autenticado: token no encontrado',
            };
        }
        
        try {
            // Formato: origin_lng,origin_lat;dest_lng,dest_lat
            const coordinatesParam = `${params.origin.longitude},${params.origin.latitude};${params.destination.longitude},${params.destination.latitude}`;
            
            // Construir los query parameters
            const queryParams = new URLSearchParams({
                coordinates: coordinatesParam,
                steps: params.steps !== undefined ? String(params.steps) : 'true',
            });

            if (params.geometries) {
                queryParams.append('geometries', params.geometries);
            }
            if (params.overview) {
                queryParams.append('overview', params.overview);
            }
            if (params.alternatives !== undefined) {
                queryParams.append('alternatives', String(params.alternatives));
            }
            if (params.continue_straight !== undefined) {
                queryParams.append('continue_straight', String(params.continue_straight));
            }

            // Construir la URL completa
            const endpoint = `${BackendUrls.OsrmRoute}?${queryParams.toString()}`;
            console.log("[osrmService] Fetching route with endpoint:", endpoint);

            const response = await api.get<OsrmRouteResult>(endpoint);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error al obtener la ruta OSRM',
                    details: response.details
                };
            }

            if (!response.data.data) {
                console.log('Error processing OSRM route response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.log('Error getting OSRM route:', error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
};
