import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { OsrmTripResult } from '@/services/osrmService';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

interface TripMapProps {
  tripData: OsrmTripResult | null;
  loading?: boolean;
  error?: string | null;
  deliveries: DeliveryItemAdapter[];
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

export const TripMap: React.FC<TripMapProps> = ({ tripData, loading, error, deliveries }) => {
  const [waypointsWithDeliveries, setWaypointsWithDeliveries] = useState<WaypointWithDelivery[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItemAdapter | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) {
      return;
    }

    try {
      const trip = tripData.trips[0];
      
      console.log('[TripMap] Processing trip data:', trip);
      console.log('[TripMap] Deliveries recibidos:', deliveries.length);

      // Extraer waypoints y asociarlos con deliveries usando waypoint_index
      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints.map(wp => {
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
        });

        setWaypointsWithDeliveries(waypointsData);
        console.log('[TripMap] Waypoints con deliveries:', waypointsData.length);
      }

      // Extraer coordenadas de la geometría (GeoJSON format)
      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coords);
        console.log('[TripMap] Coordenadas de ruta extraídas:', coords.length);
      }

      // Establecer distancia y duración totales
      setTotalDistance(trip.distance);
      setTotalDuration(trip.duration);

      // Centrar el mapa en la primera coordenada
      if (waypointsWithDeliveries.length > 0 && mapRef.current) {
        const firstCoord = waypointsWithDeliveries[0].coordinate;
        mapRef.current.animateToRegion({
          latitude: firstCoord.latitude,
          longitude: firstCoord.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 1000);
      }
    } catch (err) {
      console.error('[TripMap] Error procesando trip data:', err);
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
  if (!tripData || waypointsWithDeliveries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No hay datos de ruta optimizada para mostrar</Text>
      </View>
    );
  }

  const handleMarkerPress = (waypointData: WaypointWithDelivery) => {
    setSelectedDelivery(waypointData.delivery);
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

        {/* Markers para cada waypoint con delivery info */}
        {waypointsWithDeliveries.map((waypointData, index) => (
          <Marker
            key={`waypoint-${index}`}
            coordinate={waypointData.coordinate}
            pinColor={index === 0 ? 'green' : index === waypointsWithDeliveries.length - 1 ? 'red' : 'orange'}
            onPress={() => handleMarkerPress(waypointData)}
          />
        ))}
      </MapView>

      {/* Panel de información */}
      <View style={styles.infoPanel}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Puntos de entrega:</Text>
          <Text style={styles.infoValue}>{waypointsWithDeliveries.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distancia total:</Text>
          <Text style={styles.infoValue}>{(totalDistance / 1000).toFixed(2)} km</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tiempo estimado:</Text>
          <Text style={styles.infoValue}>{Math.round(totalDuration / 60)} min</Text>
        </View>
      </View>

      {/* Modal con información del delivery */}
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
          <View style={styles.deliveryModal}>
            {selectedDelivery && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Información de Entrega</Text>
                  <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Cliente:</Text>
                    <Text style={styles.infoItemValue}>{selectedDelivery.client}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Teléfono:</Text>
                    <Text style={styles.infoItemValue}>{selectedDelivery.phone}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Dirección:</Text>
                    <Text style={styles.infoItemValue}>{selectedDelivery.deliveryAddress}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Ubicación:</Text>
                    <Text style={styles.infoItemValue}>{selectedDelivery.title}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Estado:</Text>
                    <Text style={styles.infoItemValue}>{selectedDelivery.deliveryStatus.title}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Costo de envío:</Text>
                    <Text style={styles.infoItemValue}>RD$ {selectedDelivery.deliveryCost.toFixed(2)}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Monto a cobrar:</Text>
                    <Text style={styles.infoItemValue}>RD$ {selectedDelivery.amountToBeCharged.toFixed(2)}</Text>
                  </View>

                  {selectedDelivery.observations && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Observaciones:</Text>
                      <Text style={styles.infoItemValue}>{selectedDelivery.observations}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  noDataText: {
    color: CustomColors.textLight,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  infoPanel: {
    backgroundColor: CustomColors.backgroundDark,
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  infoLabel: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    color: CustomColors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deliveryModal: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + '20',
  },
  modalTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: CustomColors.primary,
    fontSize: 24,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    marginBottom: 5,
    opacity: 0.7,
  },
  infoItemValue: {
    color: CustomColors.textLight,
    fontSize: 16,
  },
});
