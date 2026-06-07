import { useCallback } from "react";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { AssignmentType } from "@/utils/enum";
import { WaypointGroup } from "../types";

export interface GroupProgressHandlersResult {
  handleProgressGroup: (deliveries: DeliveryItemAdapter[]) => void;
  handleGroupCompleted: (
    ids: string[],
    newStatus: string,
    freshDeliveries: DeliveryItemAdapter[],
  ) => void;
}

export interface GroupProgressHandlersParams {
  deliveryStatusOverrides: Map<string, string>;
  setDeliveryStatusOverrides: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setIsTraveling: React.Dispatch<React.SetStateAction<boolean>>;
  setTripDeliveries: (deliveries: DeliveryItemAdapter[]) => void;
  setCompletedDeliveryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  groupedWaypoints: WaypointGroup[];
  currentTargetGroupIndex: number;
  tripDeliveries: DeliveryItemAdapter[];
  router: { back: () => void };
  setGroupStatusModalParams: React.Dispatch<React.SetStateAction<{
    ids: string[];
    assignmentType: AssignmentType;
    groupTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>>;
  setGroupStatusModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useGroupProgressHandlers({
  deliveryStatusOverrides,
  setDeliveryStatusOverrides,
  setIsTraveling,
  setTripDeliveries,
  setCompletedDeliveryIds,
  groupedWaypoints,
  currentTargetGroupIndex,
  tripDeliveries,
  router,
  setGroupStatusModalParams,
  setGroupStatusModalVisible,
}: GroupProgressHandlersParams): GroupProgressHandlersResult {
  const handleProgressGroup = useCallback((deliveries: DeliveryItemAdapter[]) => {
    console.log("[TripMapScreen] handleProgressGroup llamado con deliveries:", deliveries);

    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      console.log("[TripMapScreen] No se pueden progresar 0 entregas");
      return;
    }

    const first = deliveries[0];
    if (!first) {
      console.log("[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0] es undefined/null");
      return;
    }

    console.log("[TripMapScreen] Progresando grupo de entregas:", deliveries);

    const type = deliveries[0].type;
    if (type == null) {
      console.log("[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].type es undefined/null");
    }
    const totalAmount = deliveries.reduce(
      (sum, d) => sum + (d.deliveryCost || 0) + (d.amountToBeCharged || 0),
      0,
    );
    const label = type === AssignmentType.PICKUP ? "Recogida" : "Entrega";
    const client = deliveries[0].client;
    if (client == null) {
      console.log("[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].client es undefined/null");
    }
    const groupTitle =
      deliveries.length === 1
        ? `${label}: ${client}`
        : `${deliveries.length} ${label}s en este punto`;

    const firstId = deliveries[0].id;
    if (firstId == null) {
      console.log("[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].id es undefined/null");
    }
    if (!deliveries[0].deliveryStatus) {
      console.log("[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].deliveryStatus es undefined/null");
    }
    const currentStatus =
      deliveryStatusOverrides.get(firstId) ??
      deliveries[0].deliveryStatus.title;

    setGroupStatusModalParams({
      ids: deliveries.map((d) => d.id),
      assignmentType: type,
      groupTitle,
      currentStatus,
      totalAmount,
    });
    setGroupStatusModalVisible(true);
  }, [deliveryStatusOverrides, setGroupStatusModalParams, setGroupStatusModalVisible]);

  const handleGroupCompleted = useCallback((
    ids: string[],
    newStatus: string,
    freshDeliveries: DeliveryItemAdapter[],
  ) => {
    if (!Array.isArray(ids)) {
      console.log("[TripMapScreen][DEBUG] handleGroupCompleted: ids no es array", ids);
      return;
    }
    if (!newStatus) {
      console.log("[TripMapScreen][DEBUG] handleGroupCompleted: newStatus es null/undefined");
    }
    if (!Array.isArray(freshDeliveries)) {
      console.log("[TripMapScreen][DEBUG] handleGroupCompleted: freshDeliveries no es array", freshDeliveries);
      return;
    }

    setDeliveryStatusOverrides((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, newStatus));
      return next;
    });

    if (newStatus === IDeliveryStatus.IN_PROGRESS) {
      console.log("[TripMapScreen] Iniciando viaje (estado: EN PROGRESO)");
      setIsTraveling(true);
    }

    const filteredDeliveries = freshDeliveries.filter(
      (d) => d && d.additionalDataNominatim?.lat && d.additionalDataNominatim?.lon,
    );
    const nullableCount = freshDeliveries.length - filteredDeliveries.length;
    if (nullableCount > 0) {
      console.log("[TripMapScreen][DEBUG] handleGroupCompleted: entregas sin additionalDataNominatim filtradas:", nullableCount);
    }
    setTripDeliveries(filteredDeliveries);

    if (filteredDeliveries.length === 0) {
      console.log("[TripMapScreen] No quedan entregas activas, volviendo a la pantalla principal");
      router.back();
      return;
    }

    const terminalStatuses: string[] = [
      IDeliveryStatus.DELIVERED,
      IDeliveryStatus.CANCELLED,
      IDeliveryStatus.RETURNED,
      IDeliveryStatus.SCHEDULED,
    ];
    if (!terminalStatuses.includes(newStatus)) return;

    setCompletedDeliveryIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [setDeliveryStatusOverrides, setIsTraveling, setTripDeliveries, setCompletedDeliveryIds, router]);

  return { handleProgressGroup, handleGroupCompleted };
}
