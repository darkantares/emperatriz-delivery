import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { useRouteContext } from '@/contexts/RouteContext';
import RouteInfoPanel from '@/components/RouteInfoPanel';
import DeliveryModal from '@/components/DeliveryModal';
import StatusUpdateModal from '@/components/status-update/StatusUpdateModal';

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
  count: number;
  isFirstInRoute: boolean;
  isLastInRoute: boolean;
}

export default function TripMapScreen() {
  const { tripData, tripLoading, tripError, tripDeliveries } = useRouteContext();

  const [waypointsWithDeliveries, setWaypointsWithDeliveries] = useState<WaypointWithDelivery[]>([]);
  const [groupedWaypoints, setGroupedWaypoints] = useState<WaypointGroup[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [selectedDeliveries, setSelectedDeliveries] = useState<DeliveryItemAdapter[]>([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusModalParams, setStatusModalParams] = useState<{
    itemId: string;
    itemTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>(null);

  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingDuration, setRemainingDuration] = useState<number>(0);

  const [hideCourierIcon, setHideCourierIcon] = useState<boolean>(false);
  const [hideOtherIcons, setHideOtherIcons] = useState<boolean>(false);

  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const handleProgressDelivery = (delivery: DeliveryItemAdapter) => {
    setShowDeliveryModal(false);
    setStatusModalParams({
      itemId: delivery.id,
      itemTitle: delivery.client,
      currentStatus: delivery.deliveryStatus.title,
      totalAmount: (delivery.deliveryCost || 0) + (delivery.amountToBeCharged || 0),
    });
    setStatusModalVisible(true);
  };

  const groupWaypointsByCoordinates = (waypoints: WaypointWithDelivery[]): WaypointGroup[] => {
    const groupsMap = new Map<string, WaypointGroup>();

    waypoints.forEach((waypoint, waypointIndex) => {
      const key = `${waypoint.coordinate.latitude},${waypoint.coordinate.longitude}`;

      if (groupsMap.has(key)) {
        const existingGroup = groupsMap.get(key)!;
        existingGroup.deliveries.push(waypoint.delivery);
        existingGroup.count = existingGroup.deliveries.length;
      } else {
        groupsMap.set(key, {
          coordinate: waypoint.coordinate,
          deliveries: [waypoint.delivery],
          count: 1,
          isFirstInRoute: waypointIndex === 0,
          isLastInRoute: waypointIndex === waypoints.length - 1,
        });
      }
    });

    const groups = Array.from(groupsMap.values());
    console.log(`[TripMapScreen] Agrupación completa: ${waypoints.length} waypoints -> ${groups.length} grupos`);
    return groups;
  };

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) return;

    try {
      const trip = tripData.trips[0];
      console.log('[TripMapScreen] Deliveries recibidos:', tripDeliveries.length);

      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointsData: WaypointWithDelivery[] = tripData.waypoints.map((wp:any) => {
          const originalIndex = wp.waypoint_index;
          const delivery = tripDeliveries[originalIndex];
          return {
            coordinate: { latitude: wp.location[1], longitude: wp.location[0] },
            delivery,
            index: originalIndex,
          };
        });

        setWaypointsWithDeliveries(waypointsData);
        console.log('[TripMapScreen] Waypoints con deliveries:', waypointsData.length);

        const grouped = groupWaypointsByCoordinates(waypointsData);
        setGroupedWaypoints(grouped);
        console.log('[TripMapScreen] Grupos creados:', grouped.length);

        if (waypointsData.length > 0) {
          setCurrentPosition(waypointsData[0].coordinate);
        }
      }

      if (trip.geometry && trip.geometry.coordinates) {
        const coords: Coordinate[] = trip.geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coords);
        console.log('[TripMapScreen] Coordenadas de ruta extraídas:', coords.length);
      }

      setTotalDistance(trip.distance);
      setTotalDuration(trip.duration);
      setRemainingDistance(trip.distance);
      setRemainingDuration(trip.duration);

      if (waypointsWithDeliveries.length > 0 && mapRef.current) {
        const firstCoord = waypointsWithDeliveries[0].coordinate;
        mapRef.current.animateToRegion(
          { latitude: firstCoord.latitude, longitude: firstCoord.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 },
          1000
        );
      }
    } catch (err) {
      console.error('[TripMapScreen] Error procesando trip data:', err);
    }
  }, [tripData, tripDeliveries]);

  const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371e3;
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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

  const startTrip = async () => {
    if (routeCoordinates.length === 0) {
      console.log('[TripMapScreen] No hay ruta para iniciar viaje');
      return;
    }

    if (__DEV__) {
      setIsTraveling(true);
      setCurrentIndex(0);
      console.log('[TripMapScreen] Iniciando viaje simulado (DESARROLLO)');
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('[TripMapScreen] Permiso de ubicación denegado');
          return;
        }
        setIsTraveling(true);
        setCurrentIndex(0);
        console.log('[TripMapScreen] Iniciando seguimiento GPS (PRODUCCIÓN)');
      } catch (err) {
        console.error('[TripMapScreen] Error solicitando permisos:', err);
      }
    }
  };

  const stopTrip = () => {
    setIsTraveling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    console.log('[TripMapScreen] Viaje detenido');
  };

  const handleMarkerPress = (group: WaypointGroup) => {
    setSelectedDeliveries(group.deliveries);
    setShowDeliveryModal(true);
  };

  useEffect(() => {
    if (!isTraveling || routeCoordinates.length === 0) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (locationSubscription.current) { locationSubscription.current.remove(); locationSubscription.current = null; }
      return;
    }

    if (__DEV__) {
      console.log('[TripMapScreen] Iniciando simulación automática');
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routeCoordinates.length) {
            console.log('[TripMapScreen] Destino alcanzado (simulación)');
            setIsTraveling(false);
            return prevIndex;
          }
          const expectedPosition = routeCoordinates[nextIndex];
          const actualPosition = simulateDeviation(expectedPosition);
          setCurrentPosition(actualPosition);
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: actualPosition.latitude,
              longitude: actualPosition.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
          const progressPercentage = nextIndex / routeCoordinates.length;
          setRemainingDistance(totalDistance * (1 - progressPercentage));
          setRemainingDuration(totalDuration * (1 - progressPercentage));
          return nextIndex;
        });
      }, 2000);
    } else {
      console.log('[TripMapScreen] Iniciando seguimiento GPS');
      (async () => {
        try {
          const subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 10 },
            (location) => {
              const actualPosition: Coordinate = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setCurrentPosition(actualPosition);
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: actualPosition.latitude,
                  longitude: actualPosition.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 1000);
              }
              let closestIndex = 0;
              let minDistance = Infinity;
              routeCoordinates.forEach((coord, index) => {
                const distance = calculateDistance(actualPosition, coord);
                if (distance < minDistance) { minDistance = distance; closestIndex = index; }
              });
              setCurrentIndex(closestIndex);
              const progressPercentage = closestIndex / routeCoordinates.length;
              setRemainingDistance(totalDistance * (1 - progressPercentage));
              setRemainingDuration(totalDuration * (1 - progressPercentage));
              if (routeCoordinates.length > 0) {
                const lastPoint = routeCoordinates[routeCoordinates.length - 1];
                if (calculateDistance(actualPosition, lastPoint) < 20) {
                  console.log('[TripMapScreen] Destino alcanzado (GPS)');
                  setIsTraveling(false);
                }
              }
            }
          );
          locationSubscription.current = subscription;
        } catch (err) {
          console.error('[TripMapScreen] Error iniciando seguimiento GPS:', err);
          setIsTraveling(false);
        }
      })();
    }

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (locationSubscription.current) { locationSubscription.current.remove(); locationSubscription.current = null; }
    };
  }, [isTraveling, routeCoordinates, totalDistance, totalDuration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  if (tripLoading) {
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
          <Text style={styles.noDataText}>No hay datos de ruta optimizada para mostrar</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <UrlTile
            urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeColor="#00BFFF" strokeWidth={5} />
          )}

          {isTraveling && currentIndex > 0 && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates.slice(0, currentIndex + 1)}
              strokeColor="#FFD700"
              strokeWidth={5}
            />
          )}

          {!hideOtherIcons && groupedWaypoints.map((group) => {
            const markerColor = group.isFirstInRoute ? '#4CAF50' : group.isLastInRoute ? '#F44336' : '#FF9800';
            return (
              <Marker
                key={`group-${group.coordinate.latitude}-${group.coordinate.longitude}`}
                coordinate={group.coordinate}
                onPress={() => handleMarkerPress(group)}
                zIndex={1000}
              >
                <View style={styles.customMarker}>
                  <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
                    {group.count > 1 && (
                      <View style={styles.markerBadge}>
                        <Text style={styles.markerBadgeText}>{group.count}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
                </View>
              </Marker>
            );
          })}

          {currentPosition && !hideCourierIcon && (
            <Marker
              key="courier-position"
              coordinate={currentPosition}
              title="Tu posición"
              description={isTraveling ? 'En movimiento' : ''}
              zIndex={0}
            >
              <View style={styles.courierMarker}>
                <View style={styles.courierMarkerInner}>
                  <Text style={styles.courierMarkerText}>🏍️</Text>
                </View>
              </View>
            </Marker>
          )}
        </MapView>

        {__DEV__ && (
          <View style={styles.devControls}>
            <View style={styles.checkboxRow}>
              <Text style={styles.devLabel}>Ocultar icono conductor</Text>
              <Switch value={hideCourierIcon} onValueChange={setHideCourierIcon} />
            </View>
            <View style={styles.checkboxRow}>
              <Text style={styles.devLabel}>Ocultar otros iconos</Text>
              <Switch value={hideOtherIcons} onValueChange={setHideOtherIcons} />
            </View>
          </View>
        )}

        <View style={[
            styles.controlsContainer,
            isTraveling && { bottom: 180 } /* move up 10px when traveling */
          ]}>
          {!isTraveling ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={startTrip}
              disabled={!tripData || routeCoordinates.length === 0}
            >
              <Text style={styles.controlButtonText}>
                {__DEV__ ? '🚗 Iniciar Viaje (Simulado)' : '🚗 Iniciar Viaje'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={stopTrip}>
              <Text style={styles.controlButtonText}>⏹️ Detener Viaje</Text>
            </TouchableOpacity>
          )}
        </View>

        <RouteInfoPanel
          pointsCount={groupedWaypoints.length}
          totalDistance={totalDistance}
          totalDuration={totalDuration}
          isTraveling={isTraveling}
          remainingDistance={remainingDistance}
          remainingDuration={remainingDuration}
        />

        <DeliveryModal
          visible={showDeliveryModal}
          deliveries={selectedDeliveries}
          onClose={() => setShowDeliveryModal(false)}
          onProgressDelivery={handleProgressDelivery}
        />

        {statusModalParams && (
          <StatusUpdateModal
            visible={statusModalVisible}
            onClose={() => setStatusModalVisible(false)}
            itemId={statusModalParams.itemId}
            itemTitle={statusModalParams.itemTitle}
            currentStatus={statusModalParams.currentStatus}
            totalAmount={statusModalParams.totalAmount}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + '20',
  },
  headerTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: CustomColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  customMarker: {
    alignItems: 'center',
    width: 60,
    height: 60,
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  markerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC143C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 8,
  },
  markerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  courierMarker: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
  },
  controlButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#00000080',
    padding: 8,
    borderRadius: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  devLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
