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

export interface OsrmTripParams {
    coordinates: Coordinates[];
    source?: string;
    destination?: string;
    roundtrip?: boolean;
    geometries?: string;
    overview?: string;
}

export interface OsrmTripResult {
    code: string;
    trips: OsrmTrip[];
    waypoints: OsrmWaypoint[];
}

export interface OsrmTrip {
    geometry: OsrmGeometry;
    legs: OsrmLeg[];
    distance: number;
    duration: number;
    weight_name: string;
    weight: number;
}

export interface OsrmGeometry {
    coordinates: number[][];
    type: string;
}

export interface OsrmLeg {
    steps: any[];
    distance: number;
    duration: number;
    summary: string;
    weight: number;
}

export interface OsrmWaypoint {
    waypoint_index: number;
    trips_index: number;
    location: number[];
    name: string;
    distance: number;
    hint: string;
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
    },

    /**
     * Obtiene una ruta optimizada (Trip) para múltiples waypoints usando OSRM
     * @param params Parámetros del trip (coordenadas y opciones)
     * @returns Ruta optimizada calculada por OSRM
     */
    getTrip: async (params: OsrmTripParams): Promise<{
        success: boolean;
        data?: OsrmTripResult;
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
            // Formato: lng1,lat1;lng2,lat2;lng3,lat3...
            const coordinatesParam = params.coordinates
                .map(coord => `${coord.longitude},${coord.latitude}`)
                .join(';');
            
            // Construir los query parameters
            const queryParams = new URLSearchParams({
                coordinates: coordinatesParam,
            });

            if (params.source) {
                queryParams.append('source', params.source);
            }
            if (params.destination) {
                queryParams.append('destination', params.destination);
            }
            if (params.roundtrip !== undefined) {
                queryParams.append('roundtrip', String(params.roundtrip));
            }
            if (params.geometries) {
                queryParams.append('geometries', params.geometries);
            }
            if (params.overview) {
                queryParams.append('overview', params.overview);
            }

            // Construir la URL completa
            const endpoint = `${BackendUrls.OsrmTrip}?${queryParams.toString()}`;
            console.log("[osrmService] Fetching trip with endpoint:", endpoint);

            const response = await api.get<OsrmTripResult>(endpoint);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error al obtener el trip OSRM',
                    details: response.details
                };
            }

            if (!response.data.data) {
                console.log('Error processing OSRM trip response:', response);
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
            console.log('Error getting OSRM trip:', error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
};
