import { useEffect, useState } from "react";
import {
  areStatusesLoaded,
  getDeliveryStatuses,
  IDeliveryStatus,
  validStatusTransitions,
} from "@/interfaces/delivery/deliveryStatus";
import { deliveryStatusService } from "@/services/deliveryStatusService";
import { Alert } from "react-native";

export function useStatusData(currentStatus: string) {
  const [availableStatuses, setAvailableStatuses] = useState<
    { id: number; title: string }[]
  >([]);
  const [loadingStatuses, setLoadingStatuses] = useState<boolean>(true);

  useEffect(() => {
    const loadStatuses = async () => {
      if (!areStatusesLoaded()) {
        try {
          const response = await deliveryStatusService.getDeliveryStatuses();
          if (response.success && response.data) {
            setLoadingStatuses(false);
          } else {
            Alert.alert("Error", "No se pudieron cargar los estados de entrega");
            setLoadingStatuses(false);
            return;
          }
        } catch {
          Alert.alert("Error", "Error de conexión al cargar los estados");
          setLoadingStatuses(false);
          return;
        }
      }
    };

    const processStatuses = () => {
      const allStatuses = getDeliveryStatuses();
      const currentStatusAsEnum = Object.values(IDeliveryStatus).find(
        (status) => status === currentStatus
      ) as IDeliveryStatus | undefined;

      let validNextStatuses: string[] = [];
      if (currentStatusAsEnum && validStatusTransitions[currentStatusAsEnum]) {
        validNextStatuses = validStatusTransitions[currentStatusAsEnum];
      } else {
        validNextStatuses = allStatuses
          .filter((status) => status.title !== currentStatus)
          .map((status) => status.title);
      }

      const filteredStatuses = allStatuses.filter((status) =>
        validNextStatuses.includes(status.title)
      );
      setAvailableStatuses(filteredStatuses);
      setLoadingStatuses(false);
    };

    setAvailableStatuses([]);
    setLoadingStatuses(true);
    loadStatuses().then(processStatuses);

    return () => {
      setAvailableStatuses([]);
      setLoadingStatuses(true);
    };
  }, [currentStatus]);

  return { availableStatuses, loadingStatuses };
}
