import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import WebView from "react-native-webview";
import { CustomColors } from "@/constants/CustomColors";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { AssignmentType } from "@/utils/enum";
import { useRouteContext } from "@/contexts/RouteContext";
import { socketService, SocketEventType } from "@/services/websocketService";
import { Text } from "@/components/Themed";
import RouteInfoPanel from "@/components/RouteInfoPanel";
import AssignmentDetailsModal from "@/components/AssignmentDetailsModal";
import GroupStatusUpdateModal from "@/components/status-update/GroupStatusUpdateModal";
import { useRouter } from "expo-router";
import { LEAFLET_MAP_HTML } from "./trip-map-screen/leafletMapHtml";
import { styles } from "./trip-map-screen/tripMapStyles";

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface WaypointWithDelivery {
  coordinate: Coordinate;
  delivery: DeliveryItemAdapter;
  index: number;
}

interface WaypointGroup {
  coordinate: Coordinate;
  deliveries: DeliveryItemAdapter[];
  type: AssignmentType;
  count: number;
  isFirstInRoute: boolean;
  isLastInRoute: boolean;
}

export default function TripMapScreen() {
  const router = useRouter();
  const { tripData, tripLoading, tripError, tripDeliveries, recalculateRoutesViaBackend, setTripDeliveries } =
    useRouteContext();

  const [groupedWaypoints, setGroupedWaypoints] = useState<WaypointGroup[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
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
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingDuration, setRemainingDuration] = useState<number>(0);

  const [currentTargetGroupIndex, setCurrentTargetGroupIndex] =
    useState<number>(0);
  const [completedDeliveryIds, setCompletedDeliveryIds] = useState<Set<string>>(
    new Set(),
  );
  const [deliveryStatusOverrides, setDeliveryStatusOverrides] = useState<
    Map<string, string>
  >(new Map());
  // Counter instead of boolean: every MAP_READY (including WebView remounts) increments
  // this, guaranteeing all route-sync effects always re-fire.
  const [mapVersion, setMapVersion] = useState<number>(0);
  const [isManualSimulation, setIsManualSimulation] = useState<boolean>(false);
  const [isDeviating, setIsDeviating] = useState<boolean>(false);
  const [deviationDetectedTime, setDeviationDetectedTime] = useState<number>(0);

  const webViewRef = useRef<WebView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  // Keep latest recalculate function in ref so the socket handler never becomes stale
  const recalculateRef = useRef(recalculateRoutesViaBackend);
  useEffect(() => { recalculateRef.current = recalculateRoutesViaBackend; });

  // Keep route data in refs for GPS callback without stale closures
  const routeCoordinatesRef = useRef<Coordinate[]>([]);
  const totalDistanceRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);

  // Deviation detection configuration and state
  const deviationThresholdRef = useRef<number>(80); // metros
  const deviationDebounceRef = useRef<number>(30000); // 30 segundos (evitar multiples recalculos)
  const recalculationPendingRef = useRef<boolean>(false);
  const isDeviatingRef = useRef<boolean>(false);
  useEffect(() => {
    routeCoordinatesRef.current = routeCoordinates;
    totalDistanceRef.current = totalDistance;
    totalDurationRef.current = totalDuration;
    isDeviatingRef.current = isDeviating;
  }, [routeCoordinates, totalDistance, totalDuration, isDeviating]);

  // Register socket listener once — ref ensures it always calls the latest function
  useEffect(() => {
    const handleNewAssignment = () => {
      console.log('[TripMapScreen] Evento de ruta requerido recibido, recalculando ruta vía backend');
      recalculateRef.current();
    };

    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
    socketService.on(SocketEventType.DRIVERS_GROUP_ASSIGNED, handleNewAssignment);
    socketService.on(SocketEventType.DELIVERY_REORDERED, handleNewAssignment);
    socketService.on(SocketEventType.DELIVERY_STATUS_UPDATED, handleNewAssignment);

    return () => {
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
      socketService.off(SocketEventType.DRIVERS_GROUP_ASSIGNED, handleNewAssignment);
      socketService.off(SocketEventType.DELIVERY_REORDERED, handleNewAssignment);
      socketService.off(SocketEventType.DELIVERY_STATUS_UPDATED, handleNewAssignment);
    };
  }, []);

  /** Send a typed message to the Leaflet map running inside the WebView. */
  const sendToMap = (data: object) => {
    if (!webViewRef.current) {
      console.log('[TripMapScreen][DEBUG] sendToMap: webViewRef.current es null');
      return;
    }
    webViewRef.current.injectJavaScript(
      `handleMessage(${JSON.stringify(JSON.stringify(data))});true;`,
    );
  };

  const handleProgressGroup = (deliveries: DeliveryItemAdapter[]) => {
    console.log('[TripMapScreen] handleProgressGroup llamado con deliveries:', deliveries);
        
    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      console.log('[TripMapScreen] No se pueden progresar 0 entregas');
      return;
    }

    const first = deliveries[0];
    if (!first) {
      console.log('[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0] es undefined/null');
      return;
    }
    
    console.log('[TripMapScreen] Progresando grupo de entregas:', deliveries);

    const type = deliveries[0].type;
    if (type == null) {
      console.log('[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].type es undefined/null');
    }
    const totalAmount = deliveries.reduce(
      (sum, d) => sum + (d.deliveryCost || 0) + (d.amountToBeCharged || 0),
      0,
    );
    const label = type === AssignmentType.PICKUP ? "Recogida" : "Entrega";
    const client = deliveries[0].client;
    if (client == null) {
      console.log('[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].client es undefined/null');
    }
    const groupTitle =
      deliveries.length === 1
        ? `${label}: ${client}`
        : `${deliveries.length} ${label}s en este punto`;
    // Use the locally-tracked override if this group's status was updated during this session
    const firstId = deliveries[0].id;
    if (firstId == null) {
      console.log('[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].id es undefined/null');
    }
    if (!deliveries[0].deliveryStatus) {
      console.log('[TripMapScreen][DEBUG] handleProgressGroup: deliveries[0].deliveryStatus es undefined/null');
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
  };

  const handleMarkerClick = (groupIndex: number) => {
    const group = groupedWaypoints[groupIndex];
    if (!group) {
      console.log('[TripMapScreen][DEBUG] handleMarkerClick: grupo no encontrado para index', groupIndex);
      return;
    }
    if (!group.deliveries || group.deliveries.length === 0) {
      console.log('[TripMapScreen][DEBUG] handleMarkerClick: group.deliveries vacío para index', groupIndex);
      return;
    }

    setSelectedAssignment(group.deliveries[0]);
    setAssignmentModalVisible(true);
  };

  const handleMarkerClickByDeliveryId = (deliveryId: string) => {
    if (!deliveryId) {
      console.log('[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId es undefined/null');
      return;
    }
    if (!tripDeliveries || tripDeliveries.length === 0) {
      console.log('[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: tripDeliveries vacío, deliveryId:', deliveryId);
    }
    const found = tripDeliveries.find((d) => d.id === deliveryId);
    if (found) {
      setSelectedAssignment(found);
      setAssignmentModalVisible(true);
      return;
    }

    console.log('[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId no encontrado en tripDeliveries, buscando en groupedWaypoints:', deliveryId);
    // fallback to group index if deliveryId not found
    const group = groupedWaypoints.find((g) => g.deliveries.some((d) => d.id === deliveryId));
    if (group) {
      setSelectedAssignment(group.deliveries[0]);
      setAssignmentModalVisible(true);
    } else {
      console.log('[TripMapScreen][DEBUG] handleMarkerClickByDeliveryId: deliveryId no encontrado en groupedWaypoints:', deliveryId);
    }
  };

  const groupWaypointsByCoordinates = (
    waypoints: WaypointWithDelivery[],
  ): WaypointGroup[] => {
    const groupsMap = new Map<string, WaypointGroup>();
    let skippedNoDelivery = 0;
    let skippedNoCoord = 0;

    waypoints.forEach((waypoint, waypointIndex) => {
      if (!waypoint) {
        console.log('[TripMapScreen][DEBUG] groupWaypointsByCoordinates: waypoint null en index', waypointIndex);
        skippedNoDelivery++;
        return;
      }
      if (!waypoint.coordinate) {
        console.log('[TripMapScreen][DEBUG] groupWaypointsByCoordinates: waypoint.coordinate null en index', waypointIndex, 'deliveryId:', waypoint.delivery?.id);
        skippedNoCoord++;
        return;
      }
      if (waypoint.coordinate.latitude == null || waypoint.coordinate.longitude == null) {
        console.log('[TripMapScreen][DEBUG] groupWaypointsByCoordinates: coordinate lat/lng null en index', waypointIndex, 'coordinate:', JSON.stringify(waypoint.coordinate));
      }
      if (!waypoint.delivery) {
        skippedNoDelivery++;
        return;
      }
      if (waypoint.delivery.type == null) {
        console.log('[TripMapScreen][DEBUG] groupWaypointsByCoordinates: delivery.type null en index', waypointIndex, 'delivery:', JSON.stringify(waypoint.delivery));
      }
      // Group by both coordinates AND assignment type so PICKUP and DELIVERY
      // at the same address are processed independently.
      const key = `${waypoint.coordinate.latitude},${waypoint.coordinate.longitude},${waypoint.delivery.type}`;

      if (groupsMap.has(key)) {
        const existingGroup = groupsMap.get(key)!;
        existingGroup.deliveries.push(waypoint.delivery);
        existingGroup.count = existingGroup.deliveries.length;
      } else {
        groupsMap.set(key, {
          coordinate: waypoint.coordinate,
          deliveries: [waypoint.delivery],
          type: waypoint.delivery?.type,
          count: 1,
          isFirstInRoute: waypointIndex === 0,
          isLastInRoute: waypointIndex === waypoints.length - 1,
        });
      }
    });

    const groups = Array.from(groupsMap.values());
    console.log(
      `[TripMapScreen] Agrupación completa: ${waypoints.length} waypoints -> ${groups.length} grupos (skipped: ${skippedNoDelivery} sin delivery, ${skippedNoCoord} sin coordenada)`,
    );
    return groups;
  };

  // Get actual courier GPS position on mount so the icon starts at the right place.
  // getLastKnownPositionAsync resolves instantly (no waiting for a GPS fix) giving
  // an immediate position, then getCurrentPositionAsync provides the accurate fix.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log('[TripMapScreen][DEBUG] inicial: permiso de ubicación no concedido');
          return;
        }
        // Immediate: use last cached GPS reading (no delay)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && lastKnown.coords) {
          if (lastKnown.coords.latitude == null || lastKnown.coords.longitude == null) {
            console.log('[TripMapScreen][DEBUG] inicial: lastKnown coords inválidas', JSON.stringify(lastKnown.coords));
          } else {
            setCurrentPosition({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
          }
        } else {
          console.log('[TripMapScreen][DEBUG] inicial: lastKnownPosition null');
        }
        // Then refine with a fresh accurate fix
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!location || !location.coords) {
          console.log('[TripMapScreen][DEBUG] inicial: getCurrentPositionAsync devolvió location null', location);
          return;
        }
        if (location.coords.latitude == null || location.coords.longitude == null) {
          console.log('[TripMapScreen][DEBUG] inicial: current position coords inválidas', JSON.stringify(location.coords));
        }
        setCurrentPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (err) {
        console.log('[TripMapScreen][DEBUG] inicial: error obteniendo posición GPS', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) {
      console.log('[TripMapScreen][DEBUG] data useEffect: tripData.trips vacío o null, tripData:', tripData ? 'exists' : 'null');
      return;
    }

    try {
      const trip = tripData.trips[0];
      if (!trip) {
        console.log('[TripMapScreen][DEBUG] data useEffect: tripData.trips[0] es null');
        return;
      }
      console.log(
        "[TripMapScreen] Deliveries recibidos:",
        tripDeliveries?.length ?? 0,
      );

      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints
          .map((wp: any, idx: number) => {
            if (!wp) {
              console.log('[TripMapScreen][DEBUG] data useEffect: wp null en waypoint index', idx);
              return null;
            }
            if (!wp.location || wp.location.length < 2) {
              console.log('[TripMapScreen][DEBUG] data useEffect: wp.location inválido en waypoint', idx, 'wp:', JSON.stringify(wp));
              return null;
            }
            const delivery =
              wp.assignmentId != null
                ? tripDeliveries.find(
                    (d) => d.id === String(wp.assignmentId),
                  )
                : tripDeliveries[wp.waypoint_index];
            if (!delivery) {
              console.log('[TripMapScreen][DEBUG] data useEffect: delivery no encontrado para waypoint', idx, 'assignmentId:', wp.assignmentId, 'waypoint_index:', wp.waypoint_index);
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

        // Reset target tracking when a new route is loaded
        setCurrentTargetGroupIndex(0);
        setCompletedDeliveryIds(new Set());
        setDeliveryStatusOverrides(new Map());
      }

      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates
          .map((coord: number[], idx: number) => {
            if (!coord || coord.length < 2 || coord[0] == null || coord[1] == null) {
              console.log('[TripMapScreen][DEBUG] data useEffect: coord inválida en índice', idx, 'coord:', JSON.stringify(coord));
              return null;
            }
            return {
              latitude: coord[1],
              longitude: coord[0],
            };
          })
          .filter(Boolean) as Coordinate[];
        setRouteCoordinates(coords);
        console.log(
          "[TripMapScreen] Coordenadas de ruta extraídas:",
          coords.length,
        );
      } else {
        console.log('[TripMapScreen][DEBUG] data useEffect: trip.geometry o trip.geometry.coordinates es null');
      }

      if (trip.distance == null) {
        console.log('[TripMapScreen][DEBUG] data useEffect: trip.distance es null/undefined');
      }
      if (trip.duration == null) {
        console.log('[TripMapScreen][DEBUG] data useEffect: trip.duration es null/undefined');
      }
      setTotalDistance(trip.distance);
      setTotalDuration(trip.duration);
      setRemainingDistance(trip.distance);
      setRemainingDuration(trip.duration);
      // Map centering is handled by the INIT_ROUTE Leaflet call (fitBounds)
    } catch (err: any) {
      console.error("[TripMapScreen] Error procesando trip data:", err);
    }
  }, [tripData, tripDeliveries]);

  const calculateDistance = (
    coord1: Coordinate,
    coord2: Coordinate,
  ): number => {
    if (!coord1 || coord1.latitude == null || coord1.longitude == null) {
      console.log('[TripMapScreen][DEBUG] calculateDistance: coord1 inválida', JSON.stringify(coord1));
      return Infinity;
    }
    if (!coord2 || coord2.latitude == null || coord2.longitude == null) {
      console.log('[TripMapScreen][DEBUG] calculateDistance: coord2 inválida', JSON.stringify(coord2));
      return Infinity;
    }
    const R = 6371e3;
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const simulateDeviation = (coord: Coordinate): Coordinate => {
    if (!coord) {
      console.log('[TripMapScreen][DEBUG] simulateDeviation: coord null');
      return coord;
    }
    if (Math.random() > 0.9) {
      const deviationAmount = 0.0005;
      return {
        latitude: coord.latitude + (Math.random() - 0.5) * deviationAmount,
        longitude: coord.longitude + (Math.random() - 0.5) * deviationAmount,
      };
    }
    return coord;
  };

  /**
   * Detecta si el mensajero se ha desviado de la ruta trazada
   * @param actualPosition - Posicion actual del mensajero
   * @param minDistance - Distancia minima al punto mas cercano de la ruta
   */
  const detectRouteDeviation = (actualPosition: Coordinate, minDistance: number): void => {
    if (!actualPosition) {
      console.log('[TripMapScreen][DEBUG] detectRouteDeviation: actualPosition null');
      return;
    }
    const now = Date.now();
    const hasDeviationThresholdExceeded = minDistance > deviationThresholdRef.current;
    const isDeviation = hasDeviationThresholdExceeded && !isDeviatingRef.current;
    const isRecovering = !hasDeviationThresholdExceeded && isDeviatingRef.current;

    if (isDeviation) {
      // Usuario se acaba de desviar
      console.log(
        `[TripMapScreen] DESVIACION DETECTADA - Distancia a ruta: ${minDistance.toFixed(0)}m (umbral: ${deviationThresholdRef.current}m)`,
      );
      setIsDeviating(true);
      setDeviationDetectedTime(now);
    } else if (isRecovering) {
      // Usuario regreso a la ruta
      console.log(
        `[TripMapScreen] DESVIACION RESUELTA - De vuelta en la ruta (distancia: ${minDistance.toFixed(0)}m)`,
      );
      setIsDeviating(false);
      recalculationPendingRef.current = false; // Cancelar recalculo pendiente si estaba
    }
  };

  /**
   * Recalcula la ruta cuando se detecta una desviacion prolongada
   * @param currentPosition - Posicion actual del mensajero
   */
  const recalculateRouteOnDeviation = (currentPosition: Coordinate): void => {
    if (!currentPosition) {
      console.log('[TripMapScreen][DEBUG] recalculateRouteOnDeviation: currentPosition null');
      return;
    }
    const now = Date.now();
    const timeSinceDeviation = now - deviationDetectedTime;
    const shouldRecalculate =
      isDeviatingRef.current &&
      timeSinceDeviation > deviationDebounceRef.current &&
      !recalculationPendingRef.current;

    if (shouldRecalculate) {
      console.log(
        `[TripMapScreen] RECALCULANDO RUTA - Desviacion persistente por ${(timeSinceDeviation / 1000).toFixed(0)}s`,
      );
      recalculationPendingRef.current = true;

      // Llamar al backend para recalcular la ruta desde la posicion actual
      // recalculateRoutesViaBackend() maneja la recepcion de nuevos datos
      // y automaticamente actualiza routeCoordinates, lo que dispara el useEffect
      // que redibuja el mapa con INIT_ROUTE
      recalculateRef.current();
    }
  };

  const handleGroupCompleted = (ids: string[], newStatus: string, freshDeliveries: DeliveryItemAdapter[]) => {
    if (!Array.isArray(ids)) {
      console.log('[TripMapScreen][DEBUG] handleGroupCompleted: ids no es array', ids);
      return;
    }
    if (!newStatus) {
      console.log('[TripMapScreen][DEBUG] handleGroupCompleted: newStatus es null/undefined');
    }
    if (!Array.isArray(freshDeliveries)) {
      console.log('[TripMapScreen][DEBUG] handleGroupCompleted: freshDeliveries no es array', freshDeliveries);
      return;
    }

    // Always track the latest status so the modal shows correct transitions on re-open
    setDeliveryStatusOverrides((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, newStatus));
      return next;
    });

    // Start traveling when marking as IN_PROGRESS
    if (newStatus === IDeliveryStatus.IN_PROGRESS) {
      console.log('[TripMapScreen] Iniciando viaje (estado: EN PROGRESO)');
      setIsTraveling(true);
    }

    // Update the route with the fresh active deliveries from the backend
    const filteredDeliveries = freshDeliveries.filter((d) => d && d.additionalDataNominatim?.lat && d.additionalDataNominatim?.lon);
    const nullableCount = freshDeliveries.length - filteredDeliveries.length;
    if (nullableCount > 0) {
      console.log('[TripMapScreen][DEBUG] handleGroupCompleted: entregas sin additionalDataNominatim filtradas:', nullableCount);
    }
    setTripDeliveries(filteredDeliveries);

    // If no more active deliveries remain, close the map and go back
    if (filteredDeliveries.length === 0) {
      console.log('[TripMapScreen] No quedan entregas activas, volviendo a la pantalla principal');
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
  };

  // -------------------------------------------------------------------------
  // Sync React state → Leaflet map (WebView messages)
  // -------------------------------------------------------------------------

  // Send route + waypoints once the map is ready (or when route data arrives)
  useEffect(() => {
    if (mapVersion === 0) {
      console.log('[TripMapScreen][DEBUG] route sync: mapVersion es 0, skipping');
      return;
    }
    if (routeCoordinates.length === 0) {
      console.log('[TripMapScreen][DEBUG] route sync: routeCoordinates vacío, skipping');
      return;
    }
    if (groupedWaypoints.length === 0) {
      console.log('[TripMapScreen][DEBUG] route sync: groupedWaypoints vacío, skipping');
      return;
    }
    const waypoints = groupedWaypoints.map((g, idx) => {
      if (!g.coordinate) {
        console.log('[TripMapScreen][DEBUG] route sync: group.coordinate null en index', idx);
      }
      if (!g.deliveries || g.deliveries.length === 0) {
        console.log('[TripMapScreen][DEBUG] route sync: group.deliveries vacío en index', idx);
      }
      return {
        latitude: g.coordinate?.latitude,
        longitude: g.coordinate?.longitude,
        count: g.count,
        type: g.type,
        isFirstInRoute: g.isFirstInRoute,
        isLastInRoute: g.isLastInRoute,
        deliveryId: g.deliveries?.[0]?.id,
      };
    });

    // Split flat routeCoordinates into one segment per waypoint (leg of the journey)
    const segmentCoordinates: number[][][] = [];
    let lastIdx = 0;
    groupedWaypoints.forEach((group) => {
      if (!group.coordinate) {
        console.log('[TripMapScreen][DEBUG] segment building: group.coordinate null, saltando segmento');
        return;
      }
      let minDist = Infinity;
      let nearestIdx = lastIdx;
      for (let i = lastIdx; i < routeCoordinates.length; i++) {
        const rc = routeCoordinates[i];
        if (!rc) {
          console.log('[TripMapScreen][DEBUG] segment building: routeCoordinates[' + i + '] es null');
          continue;
        }
        const dLat = rc.latitude - group.coordinate.latitude;
        const dLng = rc.longitude - group.coordinate.longitude;
        const d = dLat * dLat + dLng * dLng;
        if (d < minDist) { minDist = d; nearestIdx = i; }
      }
      segmentCoordinates.push(
        routeCoordinates.slice(lastIdx, nearestIdx + 1).map((c) => [c.latitude, c.longitude])
      );
      lastIdx = nearestIdx;
    });
    // Append any trailing coords to the last segment
    if (segmentCoordinates.length > 0 && lastIdx < routeCoordinates.length - 1) {
      routeCoordinates.slice(lastIdx + 1).forEach((c) =>
        segmentCoordinates[segmentCoordinates.length - 1].push([c.latitude, c.longitude])
      );
    }

    sendToMap({
      type: "INIT_ROUTE",
      segmentCoordinates,
      waypoints,
      targetGroupIndex: currentTargetGroupIndex,
    });
  }, [mapVersion, routeCoordinates, groupedWaypoints]);

  // Keep the courier marker in sync with GPS / simulation position
  useEffect(() => {
    if (mapVersion === 0 || !currentPosition) return;
    sendToMap({
      type: "UPDATE_POSITION",
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    });
  }, [mapVersion, currentPosition]);

  // Update the "already traveled" polyline segment
  useEffect(() => {
    if (mapVersion === 0 || !isTraveling || currentIndex === 0) return;
    const traveledCoords = routeCoordinates
      .slice(0, currentIndex + 1)
      .map((c) => [c.latitude, c.longitude]);
    sendToMap({ type: "UPDATE_TRAVELED", traveledCoords });
  }, [mapVersion, currentIndex, isTraveling, routeCoordinates]);

  // Highlight the current target waypoint
  useEffect(() => {
    if (mapVersion === 0) return;
    sendToMap({ type: "UPDATE_TARGET", groupIndex: currentTargetGroupIndex });
  }, [mapVersion, currentTargetGroupIndex]);

  // Handle messages coming FROM the WebView (e.g. marker clicks)
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const rawData = event?.nativeEvent?.data;
      if (rawData == null) {
        console.log('[TripMapScreen][DEBUG] handleWebViewMessage: nativeEvent.data es null/undefined');
        return;
      }
      const msg = JSON.parse(rawData) as { type: string; groupIndex?: number; deliveryId?: string };
      if (!msg || !msg.type) {
        console.log('[TripMapScreen][DEBUG] handleWebViewMessage: mensaje sin type', JSON.stringify(msg));
        return;
      }
      if (msg.type === "MAP_READY") {
        setMapVersion(v => v + 1);
      } else if (msg.type === "MARKER_CLICK") {
        if (msg.deliveryId) {
          handleMarkerClickByDeliveryId(msg.deliveryId);
        } else if (msg.groupIndex !== undefined) {
          handleMarkerClick(msg.groupIndex);
        } else {
          console.log('[TripMapScreen][DEBUG] handleWebViewMessage: MARKER_CLICK sin deliveryId ni groupIndex');
        }
      }
    } catch (err) {
      console.log('[TripMapScreen][DEBUG] handleWebViewMessage: error parseando mensaje', err, 'raw:', event?.nativeEvent?.data);
    }
  };

  // Advance to the next group when all deliveries in the current one are completed
  useEffect(() => {
    if (groupedWaypoints.length === 0) {
      console.log('[TripMapScreen][DEBUG] auto-advance: groupedWaypoints vacío');
      return;
    }
    if (completedDeliveryIds.size === 0) {
      console.log('[TripMapScreen][DEBUG] auto-advance: completedDeliveryIds vacío');
      return;
    }
    const currentGroup = groupedWaypoints[currentTargetGroupIndex];
    if (!currentGroup) {
      console.log('[TripMapScreen][DEBUG] auto-advance: no se encontró currentGroup para index', currentTargetGroupIndex);
      return;
    }
    if (!currentGroup.deliveries) {
      console.log('[TripMapScreen][DEBUG] auto-advance: currentGroup.deliveries es null/undefined');
      return;
    }
    if (
      currentGroup.deliveries.every((d) => d && d.id && completedDeliveryIds.has(d.id)) &&
      currentTargetGroupIndex < groupedWaypoints.length - 1
    ) {
      console.log('[TripMapScreen][DEBUG] auto-advance: avanzando de grupo', currentTargetGroupIndex, '->', currentTargetGroupIndex + 1);
      setCurrentTargetGroupIndex((prev) => prev + 1);
    }
  }, [completedDeliveryIds, groupedWaypoints, currentTargetGroupIndex]);

  // Note: Removed automatic redirect to main tab on completion
  // Routes now persist when navigating between tabs

  useEffect(() => {
    const shouldRun = __DEV__ ? isManualSimulation : isTraveling;
    if (!shouldRun || routeCoordinates.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      return;
    }

    if (__DEV__) {
      console.log("[TripMapScreen] Iniciando simulación manual");
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routeCoordinates.length) {
            console.log("[TripMapScreen] Destino alcanzado (simulación)");
            setIsTraveling(false);
            return prevIndex;
          }
          const expectedPosition = routeCoordinates[nextIndex];
          if (!expectedPosition) {
            console.log('[TripMapScreen][DEBUG] simulación: expectedPosition null en index', nextIndex);
            return prevIndex;
          }
          const actualPosition = simulateDeviation(expectedPosition);
          setCurrentPosition(actualPosition);
          sendToMap({
            type: 'SET_VIEW',
            latitude: actualPosition.latitude,
            longitude: actualPosition.longitude,
            zoom: 15,
          });
          const progressPercentage = nextIndex / routeCoordinates.length;
          setRemainingDistance(totalDistance * (1 - progressPercentage));
          setRemainingDuration(totalDuration * (1 - progressPercentage));
          return nextIndex;
        });
      }, 2000);
    } else {
      console.log("[TripMapScreen] Iniciando seguimiento GPS");
      (async () => {
        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 2000,
              distanceInterval: 10,
            },
            (location) => {
              if (!location || !location.coords) {
                console.log('[TripMapScreen][DEBUG] GPS viaje: location/coords null');
                return;
              }
              const actualPosition: Coordinate = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setCurrentPosition(actualPosition);
              sendToMap({
                type: 'SET_VIEW',
                latitude: actualPosition.latitude,
                longitude: actualPosition.longitude,
                zoom: 15,
              });
              let closestIndex = 0;
              let minDistance = Infinity;
              routeCoordinates.forEach((coord, index) => {
                const distance = calculateDistance(actualPosition, coord);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = index;
                }
              });
              setCurrentIndex(closestIndex);
              const progressPercentage = closestIndex / routeCoordinates.length;
              setRemainingDistance(totalDistance * (1 - progressPercentage));
              setRemainingDuration(totalDuration * (1 - progressPercentage));
              if (routeCoordinates.length > 0) {
                const lastPoint = routeCoordinates[routeCoordinates.length - 1];
                if (calculateDistance(actualPosition, lastPoint) < 20) {
                  console.log("[TripMapScreen] Destino alcanzado (GPS)");
                  setIsTraveling(false);
                }
              }
            },
          );
          locationSubscription.current = subscription;
        } catch (err: any) {
          console.error(
            "[TripMapScreen] Error iniciando seguimiento GPS:",
            err,
          );
          setIsTraveling(false);
        }
      })();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [isTraveling, isManualSimulation, routeCoordinates, totalDistance, totalDuration]);

  // =========================================================================
  // GPS TRACKING: Inicia cuando la ruta está lista, corre continuamente
  // SIN esperar a isTraveling, para mantener posición actualizada siempre
  // =========================================================================
  useEffect(() => {
    // Solo iniciar si tenemos ruta cargada y no estamos en simulación
    if (groupedWaypoints.length === 0 || __DEV__) return;

    console.log('[TripMapScreen] Iniciando tracking GPS continuo (ruta lista)');

    (async () => {
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // Actualizar cada 1 segundo
            distanceInterval: 0, // Sin mínimo de distancia (reportar todos los cambios)
          },
          (location) => {
            if (!location || !location.coords) {
              console.log('[TripMapScreen][DEBUG] GPS callback: location o coords null', location);
              return;
            }
            if (location.coords.latitude == null || location.coords.longitude == null) {
              console.log('[TripMapScreen][DEBUG] GPS callback: lat/lng null', JSON.stringify(location.coords));
              return;
            }
            const actualPosition: Coordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            // Actualizar posición del mensajero
            setCurrentPosition(actualPosition);

            // Enviar al mapa para centrar seguimiento
            sendToMap({
              type: 'UPDATE_POSITION',
              latitude: actualPosition.latitude,
              longitude: actualPosition.longitude,
            });

            // Calcular indice mas cercano en la ruta si estamos viajando
            if (isTraveling && routeCoordinatesRef.current.length > 0) {
              let closestIndex = 0;
              let minDistance = Infinity;
              routeCoordinatesRef.current.forEach((coord, index) => {
                if (!coord || coord.latitude == null || coord.longitude == null) {
                  console.log('[TripMapScreen][DEBUG] GPS: coord null en ruta index', index, JSON.stringify(coord));
                  return;
                }
                const distance = calculateDistance(actualPosition, coord);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = index;
                }
              });
              setCurrentIndex(closestIndex);

              const progressPercentage =
                closestIndex / routeCoordinatesRef.current.length;
              setRemainingDistance(
                totalDistanceRef.current * (1 - progressPercentage),
              );
              setRemainingDuration(
                totalDurationRef.current * (1 - progressPercentage),
              );

              // NUEVO: Detectar y manejar desviaciones de ruta
              detectRouteDeviation(actualPosition, minDistance);
              recalculateRouteOnDeviation(actualPosition);

              // Detectar llegada al destino
              if (routeCoordinatesRef.current.length > 0) {
                const lastPoint =
                  routeCoordinatesRef.current[
                  routeCoordinatesRef.current.length - 1
                  ];
                if (!lastPoint) {
                  console.log('[TripMapScreen][DEBUG] GPS: lastPoint null en ruta');
                } else if (calculateDistance(actualPosition, lastPoint) < 20) {
                  console.log('[TripMapScreen] Destino alcanzado (GPS continuo)');
                  setIsTraveling(false);
                }
              }
            }
          },
        );
        locationSubscription.current = subscription;
      } catch (err: any) {
        console.error('[TripMapScreen] Error en tracking GPS continuo:', err);
      }
    })();

    return () => {
      if (locationSubscription.current) {
        console.log('[TripMapScreen] Limpiando tracking GPS continuo');
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [groupedWaypoints.length, isTraveling, calculateDistance]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  // Only block the map view on first load (no prior tripData).
  // During recalculation tripData already exists, so the map stays visible.
  if (tripLoading && !tripData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={CustomColors.secondary} />
          <Text style={styles.loadingText}>Cargando ruta optimizada...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tripError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{tripError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tripData || groupedWaypoints.length === 0) {
    console.log('[TripMapScreen][DEBUG] render: sin datos - tripData:', !!tripData, 'groupedWaypoints:', groupedWaypoints.length);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.noDataText}>
            No hay datos de ruta optimizada para mostrar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html: LEAFLET_MAP_HTML }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleWebViewMessage}
        />

        <TouchableOpacity
          style={[styles.centerButton, !currentPosition && { opacity: 0.4 }]}
          onPress={() => {
            if (!currentPosition) return;
            sendToMap({
              type: 'SET_VIEW',
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              zoom: 16,
            });
          }}
        >
          <Text style={styles.centerButtonText}>📍</Text>
        </TouchableOpacity>

        {__DEV__ && routeCoordinates.length > 0 && (
          <TouchableOpacity
            style={[
              styles.simulationButton,
              isManualSimulation && styles.simulationButtonActive,
            ]}
            onPress={() => setIsManualSimulation(!isManualSimulation)}
          >
            <Text style={styles.simulationButtonText}>
              {isManualSimulation ? '⏸' : '▶️'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.controlsContainer}>
          {(() => {
            console.log('[TripMapScreen] ', groupedWaypoints.length, ' grupos de waypoints, currentTargetGroupIndex:', currentTargetGroupIndex);
            const currentGroup = groupedWaypoints[currentTargetGroupIndex];
            if (!currentGroup) {
              console.log('[TripMapScreen][DEBUG] render: currentGroup null para index', currentTargetGroupIndex, 'total grupos:', groupedWaypoints.length);
            }
            if (currentGroup && (!currentGroup.deliveries || currentGroup.deliveries.length === 0)) {
              console.log('[TripMapScreen][DEBUG] render: currentGroup.deliveries vacío para index', currentTargetGroupIndex);
            }

            const currentGroupStatus = currentGroup
              ? (deliveryStatusOverrides.get(currentGroup.deliveries?.[0]?.id) ??
                currentGroup.deliveries?.[0]?.deliveryStatus?.title)
              : null;
            const isInProgress =
              currentGroupStatus === IDeliveryStatus.IN_PROGRESS;
            const hasAssignments = tripDeliveries.length > 0;
            return (
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isInProgress ? styles.inProgressButton : styles.startButton,
                  !hasAssignments && { opacity: 0.5 },
                ]}
                onPress={() =>
                  currentGroup && handleProgressGroup(currentGroup.deliveries)
                }
                disabled={!currentGroup || !hasAssignments}
              >
                <Text style={styles.controlButtonText}>
                  {isInProgress ? "En Progreso..." : "🚗 Iniciar Viaje"}
                </Text>
              </TouchableOpacity>
            );
          })()}
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
              console.log('[TripMapScreen][DEBUG] assignmentModal: cerrando sin selectedAssignment');
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


