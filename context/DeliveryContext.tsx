import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';
import { DeliveryItemAdapter, adaptDeliveriesToAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { getDeliveries } from '@/core/actions/delivery.actions';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { useActiveDelivery } from './ActiveDeliveryContext';
import { useAuth } from '@/context/AuthContext';

interface DeliveryContextType {
    deliveries: DeliveryItemAdapter[];
    allDeliveries: DeliveryItemAdapter[];
    inProgressDelivery: DeliveryItemAdapter | null;
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
    const { setActiveDelivery } = useActiveDelivery();
    const { isAuthenticated, isLoading } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItemAdapter[]>([]);
    const [allDeliveries, setAllDeliveries] = useState<DeliveryItemAdapter[]>([]);
    const [inProgressDelivery, setInProgressDelivery] = useState<DeliveryItemAdapter | null>(null);
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

            // Guardar todos los deliveries tal como vienen del backend
            setAllDeliveries(adaptedDeliveries);

            // Verificar si hay algún envío en progreso (IN_PROGRESS)
            const inProgressIndex = adaptedDeliveries.findIndex(delivery =>
                delivery.deliveryStatus.title === IDeliveryStatus.IN_PROGRESS
            );

            if (inProgressIndex !== -1) {
                if (adaptedDeliveries.length === 1) {
                    setDeliveries([]);
                    setInProgressDelivery(adaptedDeliveries[0]);
                    setActiveDelivery(adaptedDeliveries[0]);
                } else {
                    const inProgress = adaptedDeliveries[inProgressIndex];
                    const remainingDeliveries = adaptedDeliveries.filter((_, index) => index !== inProgressIndex);
                    setDeliveries(remainingDeliveries);
                    setInProgressDelivery(inProgress);
                    setActiveDelivery(inProgress);
                }
            } else {
                setDeliveries(adaptedDeliveries);
                setInProgressDelivery(null);
                setActiveDelivery(null);
            }
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

        setAllDeliveries((currentDeliveries) =>
            currentDeliveries.map((delivery) =>
                delivery.id === updatedDelivery.id ? updatedDelivery : delivery
            )
        );

        // Verificar si la entrega actualizada está en progreso
        if (updatedDelivery.deliveryStatus.title === IDeliveryStatus.IN_PROGRESS) {
            // Si está en progreso, actualizar el estado de la entrega en progreso
            setInProgressDelivery(updatedDelivery);
            setActiveDelivery(updatedDelivery);

            // Eliminar de la lista principal si existe
            setDeliveries(currentDeliveries =>
                currentDeliveries.filter(delivery => delivery.id !== updatedDelivery.id)
            );
        }
        // Si no está en progreso pero era la entrega en progreso, entonces la completó o la canceló
        else if (inProgressDelivery && updatedDelivery.id === inProgressDelivery.id) {
            // Limpiar estados
            setInProgressDelivery(null);
            setActiveDelivery(null);
        }
        // Actualización normal para entregas que no están en progreso
        else {
            setDeliveries(currentDeliveries => currentDeliveries.map(delivery =>
                delivery.id === updatedDelivery.id ? updatedDelivery : delivery
            ));
        }
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
        // Buscar si la entrega está en el array principal
        const deliveryInList = deliveries.find(d => d.id === deliveryId);
        const isInProgressDelivery = inProgressDelivery?.id === deliveryId;

        if (deliveryInList) {
            const updatedDelivery = {
                ...deliveryInList,
                deliveryStatus: {
                    ...deliveryInList.deliveryStatus,
                    title: newStatus as IDeliveryStatus
                }
            };

            if (newStatus === IDeliveryStatus.IN_PROGRESS) {
                // Mover a progreso
                setDeliveries(currentDeliveries =>
                    currentDeliveries.filter(delivery => delivery.id !== deliveryId)
                );
                setInProgressDelivery(updatedDelivery);
                setActiveDelivery(updatedDelivery);
            } else {
                // Actualizar en la lista
                setDeliveries(currentDeliveries =>
                    currentDeliveries.map(delivery =>
                        delivery.id === deliveryId ? updatedDelivery : delivery
                    )
                );
            }
        }
        else if (isInProgressDelivery) {
            if (newStatus === IDeliveryStatus.IN_PROGRESS) {
                // Mantener en progreso pero actualizar datos
                const updatedDelivery = {
                    ...inProgressDelivery,
                    deliveryStatus: {
                        ...inProgressDelivery.deliveryStatus,
                        title: newStatus as IDeliveryStatus
                    }
                };
                setInProgressDelivery(updatedDelivery);
                setActiveDelivery(updatedDelivery);
            } else {
                // Sacar de progreso
                setInProgressDelivery(null);
                setActiveDelivery(null);

                // En algunos casos, puede que necesite recargar para ver dónde quedó la entrega
                // Ya que puede haberse eliminado del sistema o movido a otro estado
                fetchDeliveries();
            }
        }
    };

    const value: DeliveryContextType = {
        deliveries,
        allDeliveries,
        inProgressDelivery,
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
