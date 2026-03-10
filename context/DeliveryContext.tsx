import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';
import { DeliveryItemAdapter, adaptDeliveriesToAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { getDeliveries } from '@/core/actions/delivery.actions';
import { useAuth } from '@/context/AuthContext';

interface DeliveryContextType {
    deliveries: DeliveryItemAdapter[];
    allDeliveries: DeliveryItemAdapter[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    fetchDeliveries: (isRefreshing?: boolean) => Promise<void>;
    onRefresh: () => void;
    handleDeliveryUpdated: (data: IDeliveryAssignmentEntity) => void;
    handleDeliveryAssigned: (data: IDeliveryAssignmentEntity) => void;
    handleDeliveryReordered: (data: IDeliveryAssignmentEntity[]) => void;
    updateLocalDeliveryStatus: (deliveryId: string, newStatus: string) => void;
    handleDriversGroupAssigned: (data: IDeliveryAssignmentEntity[]) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const useDelivery = () => {
    const context = useContext(DeliveryContext);
    if (context === undefined) {
        throw new Error('useDelivery must be used within a DeliveryProvider');
    }
    return context;
};

interface DeliveryProviderProps {
    children: ReactNode;
}

export const DeliveryProvider: React.FC<DeliveryProviderProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItemAdapter[]>([]);
    const [allDeliveries, setAllDeliveries] = useState<DeliveryItemAdapter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const upsertById = useCallback(
        (currentDeliveries: DeliveryItemAdapter[], incomingDeliveries: DeliveryItemAdapter[]) => {
            const deliveriesMap = new Map(
                currentDeliveries.map((delivery) => [delivery.id, delivery])
            );

            incomingDeliveries.forEach((delivery) => {
                deliveriesMap.set(delivery.id, delivery);
            });

            return Array.from(deliveriesMap.values());
        },
        [],
    );

    useEffect(() => {
        const init = async () => {
            if (isLoading) return;
            if (!isAuthenticated) {
                setLoading(false);
                setRefreshing(false);
                return;
            }
            fetchDeliveries();
        };
        init();
    }, [isAuthenticated, isLoading]);

    const fetchDeliveries = async (isRefreshing = false) => {
        if (!isRefreshing) {
            setLoading(true);
        }
        setError(null);

        try {
            const deliveriesData = await getDeliveries();
            const adaptedDeliveries = adaptDeliveriesToAdapter(deliveriesData);

            setAllDeliveries(adaptedDeliveries);
            setDeliveries(adaptedDeliveries);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.log('Error al cargar entregas 2:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDeliveries(true);
    };

    const handleDeliveryUpdated = (data: IDeliveryAssignmentEntity) => {
        const updatedDelivery = adaptDeliveriesToAdapter([data])[0];

        const update = (list: DeliveryItemAdapter[]) =>
            list.map((d) => (d.id === updatedDelivery.id ? updatedDelivery : d));

        setDeliveries(update);
        setAllDeliveries(update);
    };

    const handleDeliveryAssigned = (data: IDeliveryAssignmentEntity) => {        
        const [adaptedDelivery] = adaptDeliveriesToAdapter([data]);

        setDeliveries((currentDeliveries) => upsertById(currentDeliveries, [adaptedDelivery]));
        setAllDeliveries((currentDeliveries) => upsertById(currentDeliveries, [adaptedDelivery]));
    };

    const handleDriversGroupAssigned = (data: IDeliveryAssignmentEntity[]) => {
        const adaptedDeliveries = adaptDeliveriesToAdapter(data);

        setDeliveries((currentDeliveries) => upsertById(currentDeliveries, adaptedDeliveries));
        setAllDeliveries((currentDeliveries) => upsertById(currentDeliveries, adaptedDeliveries));
    };

    const handleDeliveryReordered = (data: IDeliveryAssignmentEntity[]) => {
        // setDeliveries(adaptDeliveriesToAdapter(data));
        fetchDeliveries()
    };

    // Función para actualizar el estado local de una entrega (para uso del modal)
    const updateLocalDeliveryStatus = (deliveryId: string, newStatus: string) => {
        const update = (list: DeliveryItemAdapter[]) =>
            list.map((d) => {
                if (d.id !== deliveryId) return d;
                return { ...d, deliveryStatus: { ...d.deliveryStatus, title: newStatus as any } };
            });
        setDeliveries(update);
        setAllDeliveries(update);
    };

    const value: DeliveryContextType = {
        deliveries,
        allDeliveries,
        loading,
        refreshing,
        error,
        fetchDeliveries,
        onRefresh,
        handleDeliveryUpdated,
        handleDeliveryAssigned,
        handleDeliveryReordered,
        handleDriversGroupAssigned,
        updateLocalDeliveryStatus
    };

    return (
        <DeliveryContext.Provider value={value}>
            {children}
        </DeliveryContext.Provider>
    );
};
