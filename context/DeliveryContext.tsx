import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';
import { DeliveryItemAdapter, adaptDeliveriesToAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { deliveryService } from '@/services/deliveryService';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { useActiveDelivery } from './ActiveDeliveryContext';
import { useAuth } from '@/context/AuthContext';

interface DeliveryContextType {
    deliveries: DeliveryItemAdapter[];
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
    const { isAuthenticated, isLoading, logout } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItemAdapter[]>([]);
    const [inProgressDelivery, setInProgressDelivery] = useState<DeliveryItemAdapter | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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
            const response = await deliveryService.getDeliveries();

            if (response.success && response.data) {
                const adaptedDeliveries = adaptDeliveriesToAdapter(response.data);
                                
                // Verificar si hay algún envío en progreso (IN_PROGRESS)
                const inProgressIndex = adaptedDeliveries.findIndex(delivery =>
                    delivery.deliveryStatus.title === IDeliveryStatus.IN_PROGRESS
                );

                if (inProgressIndex !== -1) {
                    // Si hay solo un elemento y está IN_PROGRESS, mostrarlo como inProgressDelivery y no eliminar el array principal
                    if (adaptedDeliveries.length === 1) {
                        setDeliveries([]);
                        setInProgressDelivery(adaptedDeliveries[0]);
                        setActiveDelivery(adaptedDeliveries[0]);
                    } else {
                        // Extraer el envío en progreso
                        const inProgress = adaptedDeliveries[inProgressIndex];
                        // Eliminar el envío en progreso del array principal
                        const remainingDeliveries = adaptedDeliveries.filter((_, index) => index !== inProgressIndex);
                        // Actualizar los estados
                        setDeliveries(remainingDeliveries);
                        setInProgressDelivery(inProgress);
                        setActiveDelivery(inProgress);
                    }
                } else {
                    // Si no hay envío en progreso, simplemente actualizar las entregas
                    setDeliveries(adaptedDeliveries);
                    setInProgressDelivery(null);
                    setActiveDelivery(null);
                }
            } else {
                if (response.error === 'Unauthorized') {
                    logout();
                }
                setError(response.error || 'Error al cargar las entregas');
                console.log('Error al cargar entregas: 1', response.error);
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
        setDeliveries(currentDeliveries => [...currentDeliveries, adaptDeliveriesToAdapter([data])[0]]);
    };

    const handleDriversGroupAssigned = (data: IDeliveryAssignmentEntity[]) => {
        setDeliveries(currentDeliveries => [...currentDeliveries, ...adaptDeliveriesToAdapter(data)]);
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
