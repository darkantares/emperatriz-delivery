import { useState, useCallback } from "react";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { AssignmentType } from "@/utils/enum";
import { WaypointGroup } from "../types";

export interface TripModalsResult {
  groupStatusModalVisible: boolean;
  groupStatusModalParams: {
    ids: string[];
    assignmentType: AssignmentType;
    groupTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null;
  assignmentModalVisible: boolean;
  selectedAssignment: DeliveryItemAdapter | null;
  handleMarkerClick: (groupIndex: number) => void;
  handleMarkerClickByDeliveryId: (deliveryId: string) => void;
  setGroupStatusModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setGroupStatusModalParams: React.Dispatch<React.SetStateAction<{
    ids: string[];
    assignmentType: AssignmentType;
    groupTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>>;
  setSelectedAssignment: React.Dispatch<React.SetStateAction<DeliveryItemAdapter | null>>;
  setAssignmentModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTripModals(
  groupedWaypoints: WaypointGroup[],
  tripDeliveries: DeliveryItemAdapter[],
): TripModalsResult {
  const [groupStatusModalVisible, setGroupStatusModalVisible] = useState(false);
  const [groupStatusModalParams, setGroupStatusModalParams] = useState<{
    ids: string[];
    assignmentType: AssignmentType;
    groupTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryItemAdapter | null>(null);

  const handleMarkerClick = useCallback((groupIndex: number) => {
    const group = groupedWaypoints[groupIndex];
    if (!group) {
      console.log("[TripMapScreen][DEBUG] handleMarkerClick: grupo no encontrado para index", groupIndex);
      return;
    }
    if (!group.deliveries || group.deliveries.length === 0) {
      console.log("[TripMapScreen][DEBUG] handleMarkerClick: group.deliveries vacío para index", groupIndex);
      return;
    }
    setSelectedAssignment(group.deliveries[0]);
    setAssignmentModalVisible(true);
  }, [groupedWaypoints]);

  const handleMarkerClickByDeliveryId = useCallback((deliveryId: string) => {
    if (!deliveryId) {
      console.log("[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId es undefined/null");
      return;
    }
    if (!tripDeliveries || tripDeliveries.length === 0) {
      console.log("[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: tripDeliveries vacío, deliveryId:", deliveryId);
    }
    const found = tripDeliveries.find((d) => d.id === deliveryId);
    if (found) {
      setSelectedAssignment(found);
      setAssignmentModalVisible(true);
      return;
    }
    console.log("[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId no encontrado en tripDeliveries, buscando en groupedWaypoints:", deliveryId);
    const group = groupedWaypoints.find((g) => g.deliveries.some((d) => d.id === deliveryId));
    if (group) {
      setSelectedAssignment(group.deliveries[0]);
      setAssignmentModalVisible(true);
    } else {
      console.log("[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId no encontrado en groupedWaypoints:", deliveryId);
    }
  }, [tripDeliveries, groupedWaypoints]);

  return {
    groupStatusModalVisible,
    groupStatusModalParams,
    assignmentModalVisible,
    selectedAssignment,
    handleMarkerClick,
    handleMarkerClickByDeliveryId,
    setGroupStatusModalVisible,
    setGroupStatusModalParams,
    setSelectedAssignment,
    setAssignmentModalVisible,
  };
}
