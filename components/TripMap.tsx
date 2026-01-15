import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { OsrmTripResult } from "@/services/osrmService";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { Capitalize } from "@/utils/capitalize";
import { AssignmentType } from "@/utils/enum";
import DeliveryProductsList from '@/components/DeliveryProductsList';

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
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  const mapRef = useRef<MapView>(null);

  console.log(deliveries);
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
    setActiveTabIndex(0); // Reset al primer tab
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
      <View style={styles.infoPanel}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Puntos de entrega:</Text>
          <Text style={styles.infoValue}>{groupedWaypoints.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distancia total:</Text>
          <Text style={styles.infoValue}>
            {(totalDistance / 1000).toFixed(2)} km
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tiempo estimado:</Text>
          <Text style={styles.infoValue}>
            {Math.round(totalDuration / 60)} min
          </Text>
        </View>
      </View>

      {/* Modal con información del/los delivery(s) */}
      <Modal
        visible={showDeliveryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeliveryModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.deliveryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDeliveries.length > 1
                  ? `Entregas en este punto (${selectedDeliveries.length})`
                  : "Información de Entrega"}
              </Text>
              <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs para navegar entre entregas */}
            {selectedDeliveries.length > 1 && (
              <ScrollView
                horizontal
                style={styles.tabsContainer}
                showsHorizontalScrollIndicator={false}
              >
                {selectedDeliveries.map((delivery, index) => (
                  <TouchableOpacity
                    key={delivery.id}
                    style={[
                      styles.tab,
                      activeTabIndex === index && styles.activeTab,
                    ]}
                    onPress={() => setActiveTabIndex(index)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTabIndex === index && styles.activeTabText,
                      ]}
                    >
                      Asignacion {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Contenido del tab activo */}
            <ScrollView style={styles.modalScrollContent}>
              {selectedDeliveries[activeTabIndex] && (
                <View style={styles.modalContent}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Cliente:</Text>
                    <Text style={styles.infoItemValue}>
                      {selectedDeliveries[activeTabIndex].client} (
                      {selectedDeliveries[activeTabIndex].phone})
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Ubicación:</Text>
                    <Text style={styles.infoItemValue}>
                      {selectedDeliveries[activeTabIndex].title}
                      {"\n"}
                      {"\n"}
                      {selectedDeliveries[activeTabIndex].deliveryAddress}
                    </Text>
                  </View>

                  <View style={[styles.infoItem, { flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.infoItemLabel, styles.infoLabelInline]}>Estado:</Text>
                    <Text style={[styles.infoItemValue, { flex: 1, flexWrap: 'wrap' }]}>
                      {Capitalize(
                        selectedDeliveries[activeTabIndex].deliveryStatus.title
                      )}
                    </Text>
                  </View> 

                  <View style={[styles.infoItem, { flexDirection: 'row' }]}>
                    <Text style={[styles.infoItemLabel, styles.infoLabelInline]}>Tipo:</Text>
                    <View style={[
                      styles.typeIndicator,
                      selectedDeliveries[activeTabIndex].type === AssignmentType.PICKUP
                        ? styles.pickupIndicator
                        : selectedDeliveries[activeTabIndex].type === AssignmentType.DELIVERY
                        ? styles.deliveryIndicator
                        : styles.groupIndicator,
                      { alignSelf: 'flex-start' }
                    ]}>
                      <Text style={styles.typeText}>
                        {selectedDeliveries[activeTabIndex].type === AssignmentType.PICKUP
                          ? 'RECOGIDA'
                          : selectedDeliveries[activeTabIndex].type === AssignmentType.DELIVERY
                          ? 'ENTREGA'
                          : Capitalize(selectedDeliveries[activeTabIndex].type)}
                      </Text>
                    </View>
                  </View>
                  {selectedDeliveries[activeTabIndex].type ===
                    AssignmentType.DELIVERY && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Monto a cobrar:</Text>
                      <Text style={styles.infoItemValue}>
                        RD${" "}
                        {(
                          selectedDeliveries[activeTabIndex].amountToBeCharged +
                          selectedDeliveries[activeTabIndex].deliveryCost
                        ).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {selectedDeliveries[activeTabIndex].observations && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Observaciones:</Text>
                      <Text style={styles.infoItemValue}>
                        {selectedDeliveries[activeTabIndex].observations}
                      </Text>
                    </View>
                  )}

                  {/* Productos asociados (si aplica) */}
                  { 
                  selectedDeliveries[activeTabIndex].relatedOrder?.orderDetails && 
                  selectedDeliveries[activeTabIndex].relatedOrder.orderDetails.length > 0 && (
                    <DeliveryProductsList orderDetails={selectedDeliveries[activeTabIndex].relatedOrder.orderDetails} />
                  )}
                </View>
              )}
            </ScrollView>

            {/* Botón de progreso al pie del modal */}
            {onProgressDelivery && selectedDeliveries[activeTabIndex] && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.progressButton}
                  onPress={() => {
                    onProgressDelivery(selectedDeliveries[activeTabIndex]);
                    setShowDeliveryModal(false);
                  }}
                >
                  <Text style={styles.progressButtonText}>Progresar Envío</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  infoPanel: {
    backgroundColor: CustomColors.backgroundDark,
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
  infoLabel: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
  infoValue: {
    color: CustomColors.secondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deliveryModal: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 15,
    width: "90%",
    maxHeight: "85%",
    // height removed to allow modal to size to content up to maxHeight
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "20",
  },
  modalTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButtonText: {
    color: CustomColors.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  modalContent: {
    padding: 15,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoItemLabel: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    opacity: 0.7,
  },
  infoItemValue: {
    color: CustomColors.textLight,
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
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
  // Estilos para sistema de tabs
  tabsContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "20",
    backgroundColor: CustomColors.backgroundDarkest,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: CustomColors.primary,
  },
  tabText: {
    color: CustomColors.textLight + "80",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: CustomColors.primary,
    fontWeight: "bold",
  },
  modalScrollContent: {
    // Remove flex so it sizes to content but limit with maxHeight
    maxHeight: 700,
    paddingBottom: 12,
  },
  // Estilos para indicador de tipo (copiados de ActiveDeliveryCard)
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIndicator: {
    backgroundColor: CustomColors.quaternary,
  },
  deliveryIndicator: {
    backgroundColor: CustomColors.secondary,
  },
  groupIndicator: {
    backgroundColor: CustomColors.tertiary,
  },
  typeText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Inline label width to align values
  infoLabelInline: {
    width: 60,
  },
  // Estilos deprecados (mantenidos por compatibilidad)
  deliveryHeader: {
    backgroundColor: CustomColors.backgroundDarkest,
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  deliveryNumber: {
    color: CustomColors.primary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  deliverySeparator: {
    height: 2,
    backgroundColor: CustomColors.primary + "30",
    marginVertical: 15,
    marginHorizontal: 15,
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: CustomColors.textLight + "20",
    backgroundColor: CustomColors.backgroundDark,
  },
  progressButton: {
    backgroundColor: CustomColors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  progressButtonText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
});
