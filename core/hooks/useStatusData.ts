import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
    areStatusesLoaded,
    getDeliveryStatuses as getCachedStatuses,
    IDeliveryStatus,
    setDeliveryStatuses,
    validStatusTransitions,
} from '@/interfaces/delivery/deliveryStatus';
import { getDeliveryStatuses } from '@/core/actions/deliveryStatus.actions';

export function useStatusData(currentStatus: string) {
    const [allStatuses, setAllStatuses] = useState<{ id: number; title: string }[]>([]);
    const [loadingStatuses, setLoadingStatuses] = useState<boolean>(true);

    useEffect(() => {
        const loadStatuses = async () => {
            if (!areStatusesLoaded()) {
                try {
                    const data = await getDeliveryStatuses();
                    if (data && data.length > 0) {
                        setDeliveryStatuses(data);
                        setAllStatuses(getCachedStatuses());
                    } else {
                        Alert.alert('Error', 'No se pudieron cargar los estados de entrega');
                        return;
                    }
                } catch {
                    Alert.alert('Error', 'Error de conexión al cargar los estados');
                    return;
                }
            } else {
                setAllStatuses(getCachedStatuses());
            }
            setLoadingStatuses(false);
        };

        loadStatuses();
    }, []);

    const availableStatuses = useMemo(() => {
        if (allStatuses.length === 0) return [];

        const currentStatusAsEnum = Object.values(IDeliveryStatus).find(
            (status) => status === currentStatus,
        ) as IDeliveryStatus | undefined;

        let validNextStatuses: string[] = [];

        if (currentStatusAsEnum && validStatusTransitions[currentStatusAsEnum]) {
            validNextStatuses = validStatusTransitions[currentStatusAsEnum];
        } else {
            validNextStatuses = allStatuses
                .filter((status) => status.title !== currentStatus)
                .map((status) => status.title);
        }

        return allStatuses.filter((status) =>
            validNextStatuses.includes(status.title),
        );
    }, [currentStatus, allStatuses]);

    return { availableStatuses, loadingStatuses };
}
