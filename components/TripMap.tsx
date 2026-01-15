import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { OsrmTripResult } from "@/services/osrmService";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import RouteInfoPanel from '@/components/RouteInfoPanel';
import DeliveryModal from '@/components/DeliveryModal';

interface TripMapProps {
  tripData: OsrmTripResult | null;
  loading?: boolean;
  error?: string | null;
  deliveries: DeliveryItemAdapter[];
  onProgressDelivery?: (delivery: DeliveryItemAdapter) => void;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface WaypointWithDelivery {
  coordinate: Coordinate;
  delivery: DeliveryItemAdapter;
  index: number;
}

/**
 * Representa un grupo de waypoints que comparten la misma coordenada exacta
 */
interface WaypointGroup {
  coordinate: Coordinate;
  deliveries: DeliveryItemAdapter[];
  count: number;
  isFirstInRoute: boolean;
  isLastInRoute: boolean;
}

export const TripMap: React.FC<TripMapProps> = ({
  tripData,
  loading,
  error,
  deliveries,
  onProgressDelivery,
}) => {
  const [waypointsWithDeliveries, setWaypointsWithDeliveries] = useState<
    WaypointWithDelivery[]
  >([]);
  const [groupedWaypoints, setGroupedWaypoints] = useState<WaypointGroup[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [selectedDeliveries, setSelectedDeliveries] = useState<
    DeliveryItemAdapter[]
  >([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);

  const mapRef = useRef<MapView>(null);

  /**
   * Agrupa waypoints que comparten exactamente la misma latitud y longitud
   * @param waypoints Array de waypoints con sus deliveries asociados
   * @returns Array de grupos donde cada grupo contiene todos los deliveries del mismo punto
   */
  const groupWaypointsByCoordinates = (
    waypoints: WaypointWithDelivery[]
  ): WaypointGroup[] => {
    // Mapa para agrupar por clave "lat,lng"
    const groupsMap = new Map<string, WaypointGroup>();

    waypoints.forEach((waypoint, waypointIndex) => {
      // Crear clave única usando lat y lng con precisión completa
      const key = `${waypoint.coordinate.latitude},${waypoint.coordinate.longitude}`;

      if (groupsMap.has(key)) {
        // Ya existe un grupo para esta coordenada, agregar delivery
        const existingGroup = groupsMap.get(key)!;
        existingGroup.deliveries.push(waypoint.delivery);
        existingGroup.count = existingGroup.deliveries.length;
      } else {
        // Crear nuevo grupo para esta coordenada
        groupsMap.set(key, {
          coordinate: waypoint.coordinate,
          deliveries: [waypoint.delivery],
          count: 1,
          isFirstInRoute: waypointIndex === 0,
          isLastInRoute: waypointIndex === waypoints.length - 1,
        });
      }
    });

    // Convertir el mapa a array
    const groups = Array.from(groupsMap.values());
    console.log(
      `[TripMap] Agrupación completa: ${waypoints.length} waypoints -> ${groups.length} grupos`
    );

    return groups;
  };

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) {
      return;
    }

    try {
      const trip = tripData.trips[0];

      console.log("[TripMap] Processing trip data:", trip);
      console.log("[TripMap] Deliveries recibidos:", deliveries.length);

      // Extraer waypoints y asociarlos con deliveries usando waypoint_index
      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints.map(
          (wp) => {
            // waypoint_index indica el índice original de la coordenada enviada
            const originalIndex = wp.waypoint_index;
            const delivery = deliveries[originalIndex];

            return {
              coordinate: {
                latitude: wp.location[1],
                longitude: wp.location[0],
              },
              delivery: delivery,
              index: originalIndex,
            };
          }
        );

        setWaypointsWithDeliveries(waypointsData);
        console.log(
          "[TripMap] Waypoints con deliveries:",
          waypointsData.length
        );

        // Agrupar waypoints por coordenadas exactas
        const grouped = groupWaypointsByCoordinates(waypointsData);
        setGroupedWaypoints(grouped);
        console.log("[TripMap] Grupos creados:", grouped.length);
      }

      // Extraer coordenadas de la geometría (GeoJSON format)
      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates.map(
          (coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })
        );
        setRouteCoordinates(coords);
        console.log("[TripMap] Coordenadas de ruta extraídas:", coords.length);
      }

      // Establecer distancia y duración totales
      setTotalDistance(trip.distance);
      setTotalDuration(trip.duration);

      // Centrar el mapa en la primera coordenada
      if (waypointsWithDeliveries.length > 0 && mapRef.current) {
        const firstCoord = waypointsWithDeliveries[0].coordinate;
        mapRef.current.animateToRegion(
          {
            latitude: firstCoord.latitude,
            longitude: firstCoord.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
          1000
        );
      }
    } catch (err) {
      console.error("[TripMap] Error procesando trip data:", err);
    }
  }, [tripData, deliveries]);

  // Renderizar estado de carga
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={CustomColors.secondary} />
        <Text style={styles.loadingText}>Cargando ruta optimizada...</Text>
      </View>
    );
  }

  // Renderizar error
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Renderizar mensaje si no hay datos
  if (!tripData || groupedWaypoints.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>
          No hay datos de ruta optimizada para mostrar
        </Text>
      </View>
    );
  }

  /**
   * Maneja el evento de presión sobre un marker del mapa
   * @param group Grupo de waypoints asociado al marker presionado
   */
  const handleMarkerPress = (group: WaypointGroup) => {
    setSelectedDeliveries(group.deliveries);
    setShowDeliveryModal(true);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: waypointsWithDeliveries[0]?.coordinate.latitude || 0,
          longitude: waypointsWithDeliveries[0]?.coordinate.longitude || 0,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        mapType="none"
      >
        {/* Tiles de OpenStreetMap con tema oscuro */}
        <UrlTile
          urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* Dibujar la ruta completa */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00BFFF" // Azul brillante
            strokeWidth={5}
          />
        )}

        {/* Markers agrupados por coordenadas con contador visual */}
        {groupedWaypoints.map((group, index) => {
          // Determinar color del marker según posición en la ruta
          const markerColor = group.isFirstInRoute
            ? "#4CAF50"
            : group.isLastInRoute
            ? "#F44336"
            : "#FF9800";

          return (
            <Marker
              key={`group-${group.coordinate.latitude}-${group.coordinate.longitude}`}
              coordinate={group.coordinate}
              onPress={() => handleMarkerPress(group)}
            >
              <View style={styles.customMarker}>
                <View
                  style={[styles.markerPin, { backgroundColor: markerColor }]}
                >
                  {group.count > 1 && (
                    <View style={styles.markerBadge}>
                      <Text style={styles.markerBadgeText}>{group.count}</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[styles.markerArrow, { borderTopColor: markerColor }]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Panel de información */}
      <RouteInfoPanel
        pointsCount={groupedWaypoints.length}
        totalDistance={totalDistance}
        totalDuration={totalDuration}
      />

      {/* Modal con información del/los delivery(s) */}
      <DeliveryModal
        visible={showDeliveryModal}
        deliveries={selectedDeliveries}
        onClose={() => setShowDeliveryModal(false)}
        onProgressDelivery={onProgressDelivery}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
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



  // Estilos para custom marker con pin circular
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
  // Estilos para el badge de contador en markers
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




});
