import { IDeliveryAssignmentEntity, IUpdateDelivery, ICreateDeliveryAssigment, IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { api, extractDataFromResponse } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResponseDataAPI } from '@/interfaces/response';
import { BackendUrls } from '@/utils/enum';

/**
 * Servicio para gestionar las operaciones relacionadas con las entregas (deliveries)
 */
export const deliveryService = {
    
    getDeliveries: async (filters?: Partial<IDeliveryAssignmentEntity>): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity[];
        total?: number;
        error?: string;
        details?: any;
    }> => {
        // Verificar token antes de hacer la solicitud
        const token = await AsyncStorage.getItem('auth_token');
        // console.log('Token obtenido en deliveryService.getDeliveries:', token);
        
        if (!token) {
            return {
                success: false,
                error: 'No autenticado: token no encontrado',
            };
        }
        try {
            // Construir los query params si hay filtros
            let queryParams = '';
            if (filters) {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params.append(key, value.toString());
                    }
                });
                queryParams = params.toString() ? `?${params.toString()}` : '';
            }

            // Hacemos la petición al API
            const response = await api.get<ResponseDataAPI<IDeliveryAssignmentEntity[]>>(`${BackendUrls.DeliveryAssignments}/by-driver/${queryParams}`);

            // Si hay un error en la respuesta, lo devolvemos
            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Error al obtener entregas',
                    details: response.details
                };
            }

            // Verificamos la estructura de la respuesta directamente, sin usar extractDataFromResponse
            // Sabemos que la estructura es: response -> data -> data -> data (array) y total
            if (!response.data || !response.data.data) {
                console.error('Error: Estructura de respuesta inesperada', response);
                return {
                    success: false,
                    error: 'Estructura de respuesta inesperada del servidor',
                    details: response
                };
            }

            // Accedemos a los datos y total directamente de la estructura conocida
            const deliveriesArray = response.data.data;
            const total = response.data.data.total || 0;

            // Verificamos que realmente tengamos un array de entregas
            if (!Array.isArray(deliveriesArray)) {
                console.error('Error: Los datos de entregas no son un array', deliveriesArray);
                return {
                    success: false,
                    error: 'Formato de datos de entregas incorrecto',
                    details: deliveriesArray
                };
            }

            return {
                success: true,
                data: deliveriesArray,
                total: total
            };
        } catch (error) {
            console.error('Error getting deliveries:', error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Obtiene una entrega por su ID
     * @param id ID de la entrega a obtener
     * @returns Detalles de la entrega
     */
    getDeliveryById: async (id: number): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity;
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
            const response = await api.get<ResponseDataAPI<IDeliveryAssignmentEntity>>(`${BackendUrls.DeliveryAssignments}/${id}`);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al obtener la entrega con ID ${id}`,
                    details: response.details
                };
            }

            if (!response.data) {
                console.error('Error processing delivery response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            // Extraer los datos del ResponseAPI
            const deliveryData = extractDataFromResponse<IDeliveryAssignmentEntity>(response);

            if (!deliveryData) {
                console.error('Error processing delivery response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: deliveryData
            };
        } catch (error) {
            console.error(`Error getting delivery with ID ${id}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Obtiene los destinos de una entrega
     * @param deliveryId ID de la entrega
     * @returns Lista de destinos
     */
    getDeliveryDestinies: async (deliveryId: number): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity[];
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
            const response = await api.get<ResponseDataAPI<IDeliveryAssignmentEntity[]>>(`${BackendUrls.DeliveryAssignments}/${deliveryId}/destinies`);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al obtener destinos de la entrega ${deliveryId}`,
                    details: response.details
                };
            }

            // Extraer los datos del ResponseAPI
            const destiniesData = extractDataFromResponse<IDeliveryAssignmentEntity[]>(response);

            if (!destiniesData) {
                console.error('Error processing destinies response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: destiniesData
            };
        } catch (error) {
            console.error(`Error getting destinies for delivery ${deliveryId}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Actualiza una entrega existente
     * @param id ID de la entrega a actualizar
     * @param deliveryData Datos actualizados
     * @returns Entrega actualizada
     */
    updateDelivery: async (id: number, deliveryData: IUpdateDelivery): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity;
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
            const response = await api.put<ResponseDataAPI<IDeliveryAssignmentEntity>>(`${BackendUrls.DeliveryAssignments}/${id}`, deliveryData);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al actualizar la entrega con ID ${id}`,
                    details: response.details
                };
            }

            // Extraer los datos del ResponseAPI
            const updatedDeliveryData = extractDataFromResponse<IDeliveryAssignmentEntity>(response);

            if (!updatedDeliveryData) {
                console.error('Error processing update delivery response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: updatedDeliveryData
            };
        } catch (error) {
            console.error(`Error updating delivery with ID ${id}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Actualiza el estado de una entrega
     * @param id ID de la entrega a actualizar
     * @param status ID del nuevo estado de la entrega
     * @param note Nota opcional para ciertos estados
     * @returns Entrega actualizada
     */
    updateDeliveryStatus: async (id: string, status: number, note?: string): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity;
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
            const payload: { status: number; note?: string } = { status };
            if (note) {
                payload.note = note;
            }
            
            const response = await api.patch<ResponseDataAPI<IDeliveryAssignmentEntity>>(`${BackendUrls.DeliveryAssignments}/${id}/status`, payload);

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al actualizar el estado de la entrega con ID ${id}`,
                    details: response.details
                };
            }

            // Extraer los datos del ResponseAPI
            const updatedDeliveryData = extractDataFromResponse<IDeliveryAssignmentEntity>(response);

            if (!updatedDeliveryData) {
                console.error('Error processing update delivery status response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: updatedDeliveryData
            };
        } catch (error) {
            console.error(`Error updating delivery status with ID ${id}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },  

    /**
     * Actualiza el estado de una entrega con múltiples evidencias fotográficas
     * @param id ID de la entrega a actualizar
     * @param status ID del nuevo estado de la entrega
     * @param note Nota opcional para ciertos estados
     * @param imageUris Array de URIs de las imágenes de evidencia
     * @returns Entrega actualizada
     */
    updateDeliveryStatusWithImages: async (id: string, status: number, note?: string, imageUris?: string[]): Promise<{
        success: boolean;
        data?: IDeliveryAssignmentEntity;
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
            // Si no hay imágenes, usar el método normal
            if (!imageUris || imageUris.length === 0) {
                console.log('No images provided, using standard updateDeliveryStatus');                
                return await deliveryService.updateDeliveryStatus(id, status, note);
            }

            // Crear FormData para envío con imágenes (una o múltiples)
            const formData = new FormData();
            formData.append('status', status.toString());
            
            if (note) {
                formData.append('note', note);
            }

            // Agregar todas las imágenes
            imageUris.forEach((imageUri, index) => {
                formData.append('images', {
                    uri: imageUri,
                    type: 'image/jpeg',
                    name: `delivery_evidence_${id}_${index}_${Date.now()}.jpg`,
                } as any);
            });
            console.log('FormData prepared for images:', formData);            
            console.log('images to upload:', imageUris.length);
            
            const response = await api.postFormData<ResponseDataAPI<IDeliveryAssignmentEntity>>(
                `${BackendUrls.DeliveryAssignments}/${id}/status-with-images`,
                formData
            );

            if (response.error || !response.data) {
                return {
                    success: false,
                    error: response.error || `Error al actualizar el estado de la entrega con ID ${id}`,
                    details: response.details
                };
            }

            // Extraer los datos del ResponseAPI
            const updatedDeliveryData = extractDataFromResponse<IDeliveryAssignmentEntity>(response);

            if (!updatedDeliveryData) {
                console.error('Error processing update delivery status with images response:', response);
                return {
                    success: false,
                    error: 'Error al procesar la respuesta del servidor',
                    details: response
                };
            }

            return {
                success: true,
                data: updatedDeliveryData
            };
        } catch (error) {
            console.error(`Error updating delivery status with image for ID ${id}:`, error);
            return {
                success: false,
                error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
};
