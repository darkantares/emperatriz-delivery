import { useDelivery } from '@/context/DeliveryContext';

/**
 * Hook para acceso rápido a funciones comunes del contexto de entregas.
 */
export const useDeliveryActions = () => {
    const { fetchDeliveries, updateLocalDeliveryStatus } = useDelivery();

    const refreshDeliveries = async () => {
        await fetchDeliveries();
    };

    const updateDeliveryStatus = (deliveryId: string, newStatus: string) => {
        updateLocalDeliveryStatus(deliveryId, newStatus);
    };

    return { refreshDeliveries, updateDeliveryStatus };
};
