import { IPaymentMethodEntity } from '@/interfaces/payment/payment';
import { api, extractDataFromResponse } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResponseDataAPI } from '@/interfaces/response';
import { BackendUrls } from '@/utils/enum';

/**
 * Servicio para gestionar las operaciones relacionadas con los métodos de pago
 */
export const paymentMethodService = {
    
    /**
     * Obtiene todos los métodos de pago disponibles
     * @returns Lista de métodos de pago
     */
    getPaymentMethods: async (): Promise<{
        success: boolean;
        data?: IPaymentMethodEntity[];
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
            const response = await api.get<ResponseDataAPI<IPaymentMethodEntity[]>>(`${BackendUrls.PaymentMethods}`);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error al obtener métodos de pago',
                    details: response.details
                };
            }

            // Extraer los datos del ResponseAPI
            const paymentMethodsData = extractDataFromResponse<IPaymentMethodEntity[]>(response);

            if (!paymentMethodsData) {
                console.error('Error processing payment methods response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: paymentMethodsData
            };
        } catch (error) {
            console.error('Error getting payment methods:', error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
};