import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { api, extractDataFromResponse } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResponseDataAPI } from '@/interfaces/response';
import { BackendUrls } from '@/utils/enum';

/**
 * Servicio para gestionar los estados de entrega
 */
export const deliveryStatusService = {
    
    /**
     * Obtiene todos los estados de entrega disponibles
     * @returns Lista de estados de entrega
     */
    getDeliveryStatuses: async (): Promise<{
        success: boolean;
        data?: IDeliveryStatusEntity[];
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
            const response = await api.get<IDeliveryStatusEntity[]>(`${BackendUrls.DeliveryStatus}`);
            
            if (response.error || !response.data.data) {
                return {
                    success: false,
                    error: response.error || 'Error al obtener estados de entrega',
                    details: response.details
                };
            }

            if (!response.data.data) {
                console.log('Error processing delivery statuses response:', response);
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
            console.log('Error getting delivery statuses:', error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Obtiene un estado de entrega por su ID
     * @param id ID del estado a obtener
     * @returns Estado de entrega
     */
    getDeliveryStatusById: async (id: number): Promise<{
        success: boolean;
        data?: IDeliveryStatusEntity;
        error?: string;
        details?: any;
    }> => {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
            return {
                success: false,
                error: 'No autenticado: token no encontrado',
            };
        }
        try {
            const response = await api.get<ResponseDataAPI<IDeliveryStatusEntity>>(`${BackendUrls.DeliveryStatus}/${id}`);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al obtener el estado con ID ${id}`,
                    details: response.details
                };
            }

            const statusData = extractDataFromResponse<IDeliveryStatusEntity>(response);

            if (!statusData) {
                console.log('Error processing delivery status response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: statusData
            };
        } catch (error) {
            console.log(`Error getting delivery status with ID ${id}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
};