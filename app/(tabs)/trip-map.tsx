import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import WebView from "react-native-webview";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { AssignmentType } from "@/utils/enum";
import { useRouteContext } from "@/contexts/RouteContext";
import { socketService, SocketEventType } from "@/services/websocketService";
import RouteInfoPanel from "@/components/RouteInfoPanel";
import AssignmentDetailsModal from "@/components/AssignmentDetailsModal";
import GroupStatusUpdateModal from "@/components/status-update/GroupStatusUpdateModal";
import { useRouter } from "expo-router";

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

// ---------------------------------------------------------------------------
// Leaflet HTML – rendered inside a WebView; no Google Maps SDK required
// ---------------------------------------------------------------------------
const LEAFLET_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f0f2f5; }
    .wp-badge {
      position: absolute; top: -6px; right: -6px;
      background: #DC143C; border-radius: 10px; min-width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: white; font-weight: bold;
      border: 2px solid white; padding: 0 3px;
    }
    .courier-wrap { font-size: 22px; line-height: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([18.4861, -69.9312], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    var routeLine = null, traveledLine = null, courierMarker = null;
    var wpMarkers = [], wpData = [];
    var courierVisible = true, wpVisible = true;

    function sendMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function makeWpIcon(wp, isTarget, orderNum) {
      var color = wp.type === 'PICKUP' ? '#2E7D32' : '#C62828';
      var w = isTarget ? 36 : 28;
      var h = Math.round(w * 1.4);
      var r = Math.round(w * 0.3);
      var cx = w / 2, cy = w / 2;
      var fontSize = orderNum > 9 ? Math.round(r * 0.75) : Math.round(r * 0.95);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<path d="M' + cx + ' 0 C' + (cx - w/2) + ' 0 0 ' + (w/2) + ' 0 ' + cy
        + ' C0 ' + (cy + w * 0.45) + ' ' + cx + ' ' + h + ' ' + cx + ' ' + h
        + ' C' + cx + ' ' + h + ' ' + w + ' ' + (cy + w * 0.45) + ' ' + w + ' ' + cy
        + ' C' + w + ' ' + (w/2) + ' ' + (cx + w/2) + ' 0 ' + cx + ' 0Z" fill="' + color + '"/>'
        + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="white"/>'
        + '<text x="' + cx + '" y="' + (cy + Math.round(fontSize * 0.38)) + '" text-anchor="middle" fill="#000000" font-size="' + fontSize + '" font-weight="bold" font-family="Arial,sans-serif">' + orderNum + '</text>'
        + '</svg>';
      var html = '<div style="position:relative;display:inline-block;">' + svg;
      if (wp.count > 1) html += '<div class="wp-badge">' + wp.count + '</div>';
      html += '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [w, h], iconAnchor: [w / 2, h] });
    }

    function initRoute(coords, waypoints, targetIdx) {
      if (routeLine) map.removeLayer(routeLine);
      if (traveledLine) { map.removeLayer(traveledLine); traveledLine = null; }
      wpMarkers.forEach(function(m) { map.removeLayer(m); });
      wpMarkers = []; wpData = waypoints;

      if (coords.length > 0) {
        routeLine = L.polyline(coords, { color: '#00BFFF', weight: 5 }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      }

      waypoints.forEach(function(wp, i) {
        var m = L.marker([wp.latitude, wp.longitude], {
          icon: makeWpIcon(wp, i === targetIdx, i + 1),
          zIndexOffset: i === targetIdx ? 1000 : 0
        });
        m.on('click', function() { sendMsg({ type: 'MARKER_CLICK', groupIndex: i, deliveryId: wp.deliveryId }); });
        if (wpVisible) m.addTo(map);
        wpMarkers.push(m);
      });
    }

    function updatePosition(lat, lng) {
      var ll = [lat, lng];
      if (!courierMarker) {
        var icon = L.divIcon({ html: '<div class="courier-wrap">\uD83C\uDFCD\uFE0F</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
        courierMarker = L.marker(ll, { icon: icon, zIndexOffset: 0 });
        if (courierVisible) courierMarker.addTo(map);
      } else {
        courierMarker.setLatLng(ll);
      }
    }

    function updateTraveled(coords) {
      if (traveledLine) map.removeLayer(traveledLine);
      if (coords.length > 1) {
        traveledLine = L.polyline(coords, { color: '#FFD700', weight: 5 }).addTo(map);
      }
    }

    function updateTarget(idx) {
      wpMarkers.forEach(function(m, i) {
        m.setIcon(makeWpIcon(wpData[i], i === idx, i + 1));
        m.setZIndexOffset(i === idx ? 1000 : 0);
      });
    }

    function setView(lat, lng, zoom) {
      map.setView([lat, lng], zoom !== undefined ? zoom : map.getZoom());
    }

    function updateVisibility(showCourier, showWaypoints) {
      courierVisible = showCourier;
      wpVisible = showWaypoints;
      if (courierMarker) {
        if (showCourier && !map.hasLayer(courierMarker)) map.addLayer(courierMarker);
        else if (!showCourier && map.hasLayer(courierMarker)) map.removeLayer(courierMarker);
      }
      wpMarkers.forEach(function(m) {
        if (showWaypoints && !map.hasLayer(m)) map.addLayer(m);
        else if (!showWaypoints && map.hasLayer(m)) map.removeLayer(m);
      });
    }

    function handleMessage(raw) {
      try {
        var msg = JSON.parse(raw);
        switch (msg.type) {
          case 'INIT_ROUTE':      initRoute(msg.routeCoordinates, msg.waypoints, msg.targetGroupIndex); break;
          case 'UPDATE_POSITION': updatePosition(msg.latitude, msg.longitude); break;
          case 'UPDATE_TRAVELED': updateTraveled(msg.traveledCoords); break;
          case 'UPDATE_TARGET':   updateTarget(msg.groupIndex); break;
          case 'SET_VIEW':        setView(msg.latitude, msg.longitude, msg.zoom); break;
          case 'UPDATE_VISIBILITY': updateVisibility(msg.showCourier, msg.showWaypoints); break;
        }
      } catch(e) {}
    }

    document.addEventListener('message', function(e) { handleMessage(e.data); });
    window.addEventListener('message', function(e) { handleMessage(e.data); });
    sendMsg({ type: 'MAP_READY' });
  </script>
</body>
</html>`;

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

  const webViewRef = useRef<WebView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  // Keep latest recalculate function in ref so the socket handler never becomes stale
  const recalculateRef = useRef(recalculateRoutesViaBackend);
  useEffect(() => { recalculateRef.current = recalculateRoutesViaBackend; });

  // Register socket listener once — ref ensures it always calls the latest function
  useEffect(() => {
    const handleNewAssignment = () => {
      console.log('[TripMapScreen] Evento de ruta requerido recibido, recalculando ruta vía backend');
      recalculateRef.current();
    };

    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
    socketService.on(SocketEventType.DRIVERS_GROUP_ASSIGNED, handleNewAssignment);
    socketService.on(SocketEventType.DELIVERY_REORDERED, handleNewAssignment);

    return () => {
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
      socketService.off(SocketEventType.DRIVERS_GROUP_ASSIGNED, handleNewAssignment);
      socketService.off(SocketEventType.DELIVERY_REORDERED, handleNewAssignment);
    };
  }, []);

  /** Send a typed message to the Leaflet map running inside the WebView. */
  const sendToMap = (data: object) => {
    webViewRef.current?.injectJavaScript(
      `handleMessage(${JSON.stringify(JSON.stringify(data))});true;`,
    );
  };

  const handleProgressGroup = (deliveries: DeliveryItemAdapter[]) => {
    if (deliveries.length === 0) return;
    console.log('[TripMapScreen] Progresando grupo de entregas:', deliveries);

    const type = deliveries[0].type;
    const totalAmount = deliveries.reduce(
      (sum, d) => sum + (d.deliveryCost || 0) + (d.amountToBeCharged || 0),
      0,
    );
    const label = type === AssignmentType.PICKUP ? "Recogida" : "Entrega";
    const groupTitle =
      deliveries.length === 1
        ? `${label}: ${deliveries[0].client}`
        : `${deliveries.length} ${label}s en este punto`;
    // Use the locally-tracked override if this group's status was updated during this session
    const firstId = deliveries[0].id;
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
    if (!group) return;

    setSelectedAssignment(group.deliveries[0]);
    setAssignmentModalVisible(true);
  };

  const handleMarkerClickByDeliveryId = (deliveryId: string) => {
    const found = tripDeliveries.find((d) => d.id === deliveryId);
    if (found) {
      setSelectedAssignment(found);
      setAssignmentModalVisible(true);
      return;
    }

    // fallback to group index if deliveryId not found
    const group = groupedWaypoints.find((g) => g.deliveries.some((d) => d.id === deliveryId));
    if (group) {
      setSelectedAssignment(group.deliveries[0]);
      setAssignmentModalVisible(true);
    }
  };

  const groupWaypointsByCoordinates = (
    waypoints: WaypointWithDelivery[],
  ): WaypointGroup[] => {
    const groupsMap = new Map<string, WaypointGroup>();

    waypoints.forEach((waypoint, waypointIndex) => {
      // Group by both coordinates AND assignment type so PICKUP and DELIVERY
      // at the same address are processed independently.
      const key = `${waypoint.coordinate.latitude},${waypoint.coordinate.longitude},${waypoint.delivery?.type}`;

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
      `[TripMapScreen] Agrupación completa: ${waypoints.length} waypoints -> ${groups.length} grupos`,
    );
    return groups;
  };

  // Get actual courier GPS position on mount so the icon starts at the right place
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch {
        // GPS unavailable; icon stays hidden until trip starts
      }
    })();
  }, []);

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) return;

    try {
      const trip = tripData.trips[0];
      console.log(
        "[TripMapScreen] Deliveries recibidos:",
        tripDeliveries.length,
      );

      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints.map(
          (wp: any) => {
            const originalIndex = wp.waypoint_index;
            const delivery = tripDeliveries[originalIndex];
            return {
              coordinate: {
                latitude: wp.location[1],
                longitude: wp.location[0],
              },
              delivery,
              index: originalIndex,
            };
          },
        );

        const grouped = groupWaypointsByCoordinates(waypointsData);
        setGroupedWaypoints(grouped);
        console.log("[TripMapScreen] Grupos creados:", grouped.length);

        // Reset target tracking when a new route is loaded
        setCurrentTargetGroupIndex(0);
        setCompletedDeliveryIds(new Set());
        setDeliveryStatusOverrides(new Map());
      }

      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates.map(
          (coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }),
        );
        setRouteCoordinates(coords);
        console.log(
          "[TripMapScreen] Coordenadas de ruta extraídas:",
          coords.length,
        );
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
    if (Math.random() > 0.9) {
      const deviationAmount = 0.0005;
      return {
        latitude: coord.latitude + (Math.random() - 0.5) * deviationAmount,
        longitude: coord.longitude + (Math.random() - 0.5) * deviationAmount,
      };
    }
    return coord;
  };

  const handleGroupCompleted = (ids: string[], newStatus: string) => {
    // Always track the latest status so the modal shows correct transitions on re-open
    setDeliveryStatusOverrides((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, newStatus));
      return next;
    });
    const terminalStatuses: string[] = [
      IDeliveryStatus.DELIVERED,
      IDeliveryStatus.CANCELLED,
      IDeliveryStatus.RETURNED,
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
    if (mapVersion === 0 || routeCoordinates.length === 0 || groupedWaypoints.length === 0) return;
    const waypoints = groupedWaypoints.map((g) => ({
      latitude: g.coordinate.latitude,
      longitude: g.coordinate.longitude,
      count: g.count,
      type: g.type,
      isFirstInRoute: g.isFirstInRoute,
      isLastInRoute: g.isLastInRoute,
      deliveryId: g.deliveries[0]?.id,
    }));
    sendToMap({
      type: "INIT_ROUTE",
      routeCoordinates: routeCoordinates.map((c) => [c.latitude, c.longitude]),
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
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; groupIndex?: number; deliveryId?: string };
      if (msg.type === "MAP_READY") {
        setMapVersion(v => v + 1);
      } else if (msg.type === "MARKER_CLICK") {
        if (msg.deliveryId) {
          handleMarkerClickByDeliveryId(msg.deliveryId);
        } else if (msg.groupIndex !== undefined) {
          handleMarkerClick(msg.groupIndex);
        }
      }
    } catch (_) { }
  };

  // Advance to the next group when all deliveries in the current one are completed
  useEffect(() => {
    if (groupedWaypoints.length === 0 || completedDeliveryIds.size === 0)
      return;
    const currentGroup = groupedWaypoints[currentTargetGroupIndex];
    if (!currentGroup) return;
    if (
      currentGroup.deliveries.every((d) => completedDeliveryIds.has(d.id)) &&
      currentTargetGroupIndex < groupedWaypoints.length - 1
    ) {
      setCurrentTargetGroupIndex((prev) => prev + 1);
    }
  }, [completedDeliveryIds, groupedWaypoints, currentTargetGroupIndex]);

  // Regresar al tab principal cuando no quedan deliveries pendientes
  useEffect(() => {
    if (tripDeliveries.length === 0) return;
    if (completedDeliveryIds.size >= tripDeliveries.length) {
      router.replace("/");
    }
  }, [completedDeliveryIds, tripDeliveries, router]);

  useEffect(() => {
    if (!isTraveling || routeCoordinates.length === 0) {
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
      console.log("[TripMapScreen] Iniciando simulación automática");
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routeCoordinates.length) {
            console.log("[TripMapScreen] Destino alcanzado (simulación)");
            setIsTraveling(false);
            return prevIndex;
          }
          const expectedPosition = routeCoordinates[nextIndex];
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
  }, [isTraveling, routeCoordinates, totalDistance, totalDuration]);

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

        {currentPosition && (
          <TouchableOpacity
            style={styles.centerButton}
            onPress={() =>
              sendToMap({
                type: 'SET_VIEW',
                latitude: currentPosition.latitude,
                longitude: currentPosition.longitude,
                zoom: 16,
              })
            }
          >
            <Text style={styles.centerButtonText}>📍</Text>
          </TouchableOpacity>
        )}

        <View style={styles.controlsContainer}>
          {(() => {
            const currentGroup = groupedWaypoints[currentTargetGroupIndex];
            const currentGroupStatus = currentGroup
              ? (deliveryStatusOverrides.get(currentGroup.deliveries[0]?.id) ??
                currentGroup.deliveries[0]?.deliveryStatus.title)
              : null;
            const isInProgress =
              currentGroupStatus === IDeliveryStatus.IN_PROGRESS;
            return (
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isInProgress ? styles.inProgressButton : styles.startButton,
                ]}
                onPress={() =>
                  currentGroup && handleProgressGroup(currentGroup.deliveries)
                }
                disabled={!currentGroup}
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
            setAssignmentModalVisible(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment ?? ({} as DeliveryItemAdapter)}
        />

        {groupStatusModalParams && (
          <GroupStatusUpdateModal
            visible={groupStatusModalVisible}
            onClose={() => setGroupStatusModalVisible(false)}
            onSuccess={(newStatus: string) =>
              handleGroupCompleted(groupStatusModalParams.ids, newStatus)
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "20",
  },
  headerTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    color: CustomColors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CustomColors.backgroundDarkest,
    padding: 20,
  },
  loadingText: {
    color: CustomColors.textLight,
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: CustomColors.primary,
    fontSize: 16,
    textAlign: "center",
  },
  noDataText: {
    color: CustomColors.textLight,
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  customMarker: {
    alignItems: "center",
    width: 60,
    height: 60,
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  markerBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#DC143C",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 8,
  },
  markerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  courierMarker: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  courierMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2196F3",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 20,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 150,
    left: 20,
    right: 20,
  },
  controlButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  inProgressButton: {
    backgroundColor: "#FF9800",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  centerButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  centerButtonText: {
    fontSize: 22,
    lineHeight: 26,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  devControls: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "#00000080",
    padding: 8,
    borderRadius: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  devLabel: {
    color: "#FFFFFF",
    fontSize: 14,
  },
});
