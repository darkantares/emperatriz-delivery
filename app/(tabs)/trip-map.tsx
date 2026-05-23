import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { CustomColors } from "@/constants/CustomColors";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { AssignmentType } from "@/utils/enum";
import { useRouteContext } from "@/contexts/RouteContext";
import RouteInfoPanel from "@/components/RouteInfoPanel";
import AssignmentDetailsModal from "@/components/AssignmentDetailsModal";
import GroupStatusUpdateModal from "@/components/status-update/GroupStatusUpdateModal";
import { useRouter } from "expo-router";
import { styles } from "@/components/trip-map-screen/tripMapStyles";
import { Coordinate, WaypointWithDelivery, WaypointGroup } from "@/components/trip-map-screen/types";
import { groupWaypointsByCoordinates } from "@/components/trip-map-screen/utils/waypointUtils";
import { useMapCommunication } from "@/components/trip-map-screen/hooks/useMapCommunication";
import { useSocketRouteUpdates } from "@/components/trip-map-screen/hooks/useSocketRouteUpdates";
import { useRouteDeviation } from "@/components/trip-map-screen/hooks/useRouteDeviation";
import { useGpsTracking } from "@/components/trip-map-screen/hooks/useGpsTracking";
import { useSimulation } from "@/components/trip-map-screen/hooks/useSimulation";
import { useTripRouteSync } from "@/components/trip-map-screen/hooks/useTripRouteSync";
import { useWaypointProgression } from "@/components/trip-map-screen/hooks/useWaypointProgression";
import TripMapView from "@/components/trip-map-screen/components/TripMapView";
import MapControls from "@/components/trip-map-screen/components/MapControls";
import SimulationControls from "@/components/trip-map-screen/components/SimulationControls";
import CenterLocationButton from "@/components/trip-map-screen/components/CenterLocationButton";
import TripMapLoadingState from "@/components/trip-map-screen/components/TripMapLoadingState";
import TripMapErrorState from "@/components/trip-map-screen/components/TripMapErrorState";
import TripMapEmptyState from "@/components/trip-map-screen/components/TripMapEmptyState";

export default function TripMapScreen() {
  const router = useRouter();
  const {
    tripData,
    tripLoading,
    tripError,
    tripDeliveries,
    recalculateRoutesViaBackend,
    setTripDeliveries,
  } = useRouteContext();

  // ----- Route-derived state -----
  const [groupedWaypoints, setGroupedWaypoints] = useState<WaypointGroup[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // ----- Waypoint progression -----
  const [currentTargetGroupIndex, setCurrentTargetGroupIndex] = useState<number>(0);
  const [completedDeliveryIds, setCompletedDeliveryIds] = useState<Set<string>>(new Set());
  const [deliveryStatusOverrides, setDeliveryStatusOverrides] = useState<Map<string, string>>(new Map());

  // ----- Modal state -----
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

  // ----- Position tracking state -----
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingDuration, setRemainingDuration] = useState<number>(0);

  // ----- Refs for stale closures -----
  const recalculateRef = useRef(recalculateRoutesViaBackend);
  useEffect(() => {
    recalculateRef.current = recalculateRoutesViaBackend;
  });

  const routeCoordinatesRef = useRef<Coordinate[]>([]);
  const totalDistanceRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  useEffect(() => {
    routeCoordinatesRef.current = routeCoordinates;
    totalDistanceRef.current = totalDistance;
    totalDurationRef.current = totalDuration;
  }, [routeCoordinates, totalDistance, totalDuration]);

  // ===== Handlers =====

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
  }, [deliveryStatusOverrides]);

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
  }, [setTripDeliveries, router]);

  // ===== Hooks =====

  const { webViewRef, mapVersion, sendToMap, handleWebViewMessage } = useMapCommunication(
    handleMarkerClick,
    handleMarkerClickByDeliveryId,
  );

  useSocketRouteUpdates(recalculateRef);

  const { detectRouteDeviation, recalculateRouteOnDeviation } = useRouteDeviation(recalculateRef);

  useGpsTracking({
    sendToMap,
    routeCoordinates,
    totalDistance,
    totalDuration,
    groupedWaypoints,
    isTraveling,
    recalculateRef,
    routeCoordinatesRef,
    totalDistanceRef,
    totalDurationRef,
    onPositionUpdate: setCurrentPosition,
    onIndexUpdate: setCurrentIndex,
    onRemainingUpdate: useCallback((d: number, t: number) => {
      setRemainingDistance(d);
      setRemainingDuration(t);
    }, []),
    onDestinationReached: useCallback(() => setIsTraveling(false), []),
    detectRouteDeviation,
    recalculateRouteOnDeviation,
  });

  const { isManualSimulation, setIsManualSimulation } = useSimulation({
    sendToMap,
    routeCoordinates,
    totalDistance,
    totalDuration,
    onPositionUpdate: setCurrentPosition,
    onIndexUpdate: setCurrentIndex,
    onRemainingUpdate: useCallback((d: number, t: number) => {
      setRemainingDistance(d);
      setRemainingDuration(t);
    }, []),
  });

  useTripRouteSync({
    mapVersion,
    sendToMap,
    routeCoordinates,
    groupedWaypoints,
    currentPosition,
    currentIndex,
    isTraveling,
    currentTargetGroupIndex,
  });

  useWaypointProgression({
    groupedWaypoints,
    completedDeliveryIds,
    currentTargetGroupIndex,
    onAdvanceTarget: useCallback((next: number) => setCurrentTargetGroupIndex(next), []),
  });

  // ===== Effects =====

  // Initial GPS position: getLastKnownPositionAsync for instant, then getCurrentPositionAsync for accurate
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("[TripMapScreen][DEBUG] inicial: permiso de ubicación no concedido");
          return;
        }
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && lastKnown.coords) {
          if (lastKnown.coords.latitude == null || lastKnown.coords.longitude == null) {
            console.log("[TripMapScreen][DEBUG] inicial: lastKnown coords inválidas", JSON.stringify(lastKnown.coords));
          } else {
            setCurrentPosition({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
          }
        } else {
          console.log("[TripMapScreen][DEBUG] inicial: lastKnownPosition null");
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!location || !location.coords) {
          console.log("[TripMapScreen][DEBUG] inicial: getCurrentPositionAsync devolvió location null", location);
          return;
        }
        if (location.coords.latitude == null || location.coords.longitude == null) {
          console.log("[TripMapScreen][DEBUG] inicial: current position coords inválidas", JSON.stringify(location.coords));
        }
        setCurrentPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (err) {
        console.log("[TripMapScreen][DEBUG] inicial: error obteniendo posición GPS", err);
      }
    })();
  }, []);

  // Process trip data into routeCoordinates, groupedWaypoints, etc.
  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) {
      console.log("[TripMapScreen][DEBUG] data useEffect: tripData.trips vacío o null, tripData:", tripData ? "exists" : "null");
      return;
    }

    try {
      const trip = tripData.trips[0];
      if (!trip) {
        console.log("[TripMapScreen][DEBUG] data useEffect: tripData.trips[0] es null");
        return;
      }
      console.log("[TripMapScreen] Deliveries recibidos:", tripDeliveries?.length ?? 0);

      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints
          .map((wp: any, idx: number) => {
            if (!wp) {
              console.log("[TripMapScreen][DEBUG] data useEffect: wp null en waypoint index", idx);
              return null;
            }
            if (!wp.location || wp.location.length < 2) {
              console.log("[TripMapScreen][DEBUG] data useEffect: wp.location inválido en waypoint", idx, "wp:", JSON.stringify(wp));
              return null;
            }
            const delivery =
              wp.assignmentId != null
                ? tripDeliveries.find((d) => d.id === String(wp.assignmentId))
                : tripDeliveries[wp.waypoint_index];
            if (!delivery) {
              console.log("[TripMapScreen][DEBUG] data useEffect: delivery no encontrado para waypoint", idx, "assignmentId:", wp.assignmentId, "waypoint_index:", wp.waypoint_index);
              return null;
            }
            return {
              coordinate: {
                latitude: wp.location[1],
                longitude: wp.location[0],
              },
              delivery,
              index: wp.waypoint_index,
            };
          })
          .filter(Boolean) as WaypointWithDelivery[];

        const grouped = groupWaypointsByCoordinates(waypointsData);
        setGroupedWaypoints(grouped);
        console.log("[TripMapScreen] Grupos creados:", grouped.length);

        setCurrentTargetGroupIndex(0);
        setCompletedDeliveryIds(new Set());
        setDeliveryStatusOverrides(new Map());
      }

      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates
          .map((coord: number[], idx: number) => {
            if (!coord || coord.length < 2 || coord[0] == null || coord[1] == null) {
              console.log("[TripMapScreen][DEBUG] data useEffect: coord inválida en índice", idx, "coord:", JSON.stringify(coord));
              return null;
            }
            return {
              latitude: coord[1],
              longitude: coord[0],
            };
          })
          .filter(Boolean) as Coordinate[];
        setRouteCoordinates(coords);
        console.log("[TripMapScreen] Coordenadas de ruta extraídas:", coords.length);
      } else {
        console.log("[TripMapScreen][DEBUG] data useEffect: trip.geometry o trip.geometry.coordinates es null");
      }

      if (trip.distance == null) {
        console.log("[TripMapScreen][DEBUG] data useEffect: trip.distance es null/undefined");
      }
      if (trip.duration == null) {
        console.log("[TripMapScreen][DEBUG] data useEffect: trip.duration es null/undefined");
      }
      setTotalDistance(trip.distance);
      setTotalDuration(trip.duration);
      setRemainingDistance(trip.distance);
      setRemainingDuration(trip.duration);
    } catch (err: any) {
      console.error("[TripMapScreen] Error procesando trip data:", err);
    }
  }, [tripData, tripDeliveries]);

  // ===== Render =====

  if (tripLoading && !tripData) {
    return <TripMapLoadingState />;
  }

  if (tripError) {
    return <TripMapErrorState message={tripError} />;
  }

  if (!tripData || groupedWaypoints.length === 0) {
    console.log("[TripMapScreen][DEBUG] render: sin datos - tripData:", !!tripData, "groupedWaypoints:", groupedWaypoints.length);
    return <TripMapEmptyState />;
  }

  // Determine current group status for the control button
  const currentGroup = groupedWaypoints[currentTargetGroupIndex];
  if (!currentGroup) {
    console.log("[TripMapScreen][DEBUG] render: currentGroup null para index", currentTargetGroupIndex, "total grupos:", groupedWaypoints.length);
  }
  if (currentGroup && (!currentGroup.deliveries || currentGroup.deliveries.length === 0)) {
    console.log("[TripMapScreen][DEBUG] render: currentGroup.deliveries vacío para index", currentTargetGroupIndex);
  }

  const currentGroupStatus = currentGroup
    ? (deliveryStatusOverrides.get(currentGroup.deliveries?.[0]?.id) ??
      currentGroup.deliveries?.[0]?.deliveryStatus?.title)
    : null;
  const hasAssignments = tripDeliveries.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TripMapView webViewRef={webViewRef} onMessage={handleWebViewMessage} />

        <CenterLocationButton
          currentPosition={currentPosition}
          onCenter={() => {
            if (!currentPosition) return;
            sendToMap({
              type: "SET_VIEW",
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              zoom: 16,
            });
          }}
        />

        {__DEV__ && routeCoordinates.length > 0 && (
          <SimulationControls
            isManualSimulation={isManualSimulation}
            onToggle={() => setIsManualSimulation(!isManualSimulation)}
          />
        )}

        <View style={styles.controlsContainer}>
          <MapControls
            currentGroupStatus={currentGroupStatus}
            hasAssignments={hasAssignments}
            isDisabled={!currentGroup || !hasAssignments}
            onPress={() => currentGroup && handleProgressGroup(currentGroup.deliveries)}
          />
        </View>

        <RouteInfoPanel
          pointsCount={groupedWaypoints.length}
          totalDistance={totalDistance}
          totalDuration={totalDuration}
          isTraveling={isTraveling}
          remainingDistance={remainingDistance}
          remainingDuration={remainingDuration}
        />

        {tripLoading && tripData && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={CustomColors.secondary} />
          </View>
        )}

        <AssignmentDetailsModal
          visible={assignmentModalVisible && !!selectedAssignment}
          onClose={() => {
            if (!selectedAssignment) {
              console.log("[TripMapScreen][DEBUG] assignmentModal: cerrando sin selectedAssignment");
            }
            setAssignmentModalVisible(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment ?? ({} as DeliveryItemAdapter)}
        />

        {groupStatusModalParams && (
          <GroupStatusUpdateModal
            visible={groupStatusModalVisible}
            onClose={() => setGroupStatusModalVisible(false)}
            onSuccess={(newStatus: string, freshDeliveries: DeliveryItemAdapter[]) =>
              handleGroupCompleted(groupStatusModalParams.ids, newStatus, freshDeliveries)
            }
            ids={groupStatusModalParams.ids}
            assignmentType={groupStatusModalParams.assignmentType}
            groupTitle={groupStatusModalParams.groupTitle}
            currentStatus={groupStatusModalParams.currentStatus}
            totalAmount={groupStatusModalParams.totalAmount}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
