import { useDelivery } from '@/context/DeliveryContext';

/**
 * Hook personalizado para acceso rápido a funciones comunes del contexto de entregas
 */
export const useDeliveryActions = () => {
  const { fetchDeliveries, updateLocalDeliveryStatus } = useDelivery();
  
  /**
   * Refrescar la lista de entregas desde el backend
   * Útil para llamar después de operaciones que modifiquen entregas
   */
  const refreshDeliveries = async () => {
    await fetchDeliveries();
  };

  /**
   * Actualizar el estado local de una entrega
   * @param deliveryId ID de la entrega
   * @param newStatus Nuevo estado de la entrega
   */
  const updateDeliveryStatus = (deliveryId: string, newStatus: string) => {
    updateLocalDeliveryStatus(deliveryId, newStatus);
  };

  return {
    refreshDeliveries,
    updateDeliveryStatus
  };
};