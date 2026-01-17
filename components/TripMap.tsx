import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import * as Location from 'expo-location';
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
  
  // Courier tracking states
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingDuration, setRemainingDuration] = useState<number>(0);

  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

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

      // console.log("[TripMap] Processing trip data:", trip);
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
        
        // Establecer posición inicial en el primer waypoint
        if (waypointsData.length > 0) {
          setCurrentPosition(waypointsData[0].coordinate);
        }
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
      
      // Inicializar distancia y duración restantes
      setRemainingDistance(trip.distance);
      setRemainingDuration(trip.duration);

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

  // Calcular distancia entre dos coordenadas (fórmula Haversine)
  const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // Simular desvío aleatorio para desarrollo
  const simulateDeviation = (coord: Coordinate): Coordinate => {
    if (Math.random() > 0.9) { // 10% probabilidad de desvío
      const deviationAmount = 0.0005; // ~55 metros
      return {
        latitude: coord.latitude + (Math.random() - 0.5) * deviationAmount,
        longitude: coord.longitude + (Math.random() - 0.5) * deviationAmount,
      };
    }
    return coord;
  };

  // Detectar si hay desvío significativo
  const isSignificantDeviation = (actualPos: Coordinate, expectedPos: Coordinate): boolean => {
    const distance = calculateDistance(actualPos, expectedPos);
    return distance > 50; // Más de 50 metros se considera desvío
  };

  // Iniciar viaje
  const startTrip = async () => {
    if (routeCoordinates.length === 0) {
      console.log('[TripMap] No hay ruta para iniciar viaje');
      return;
    }

    if (__DEV__) {
      setIsTraveling(true);
      setCurrentIndex(0);
      console.log('[TripMap] Iniciando viaje simulado (DESARROLLO)');
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('[TripMap] Permiso de ubicación denegado');
          return;
        }
        setIsTraveling(true);
        setCurrentIndex(0);
        console.log('[TripMap] Iniciando seguimiento GPS (PRODUCCIÓN)');
      } catch (err) {
        console.error('[TripMap] Error solicitando permisos:', err);
      }
    }
  };

  // Detener viaje
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
    
    console.log('[TripMap] Viaje detenido');
  };

  /**
   * Maneja el evento de presión sobre un marker del mapa
   * @param group Grupo de waypoints asociado al marker presionado
   */
  const handleMarkerPress = (group: WaypointGroup) => {
    setSelectedDeliveries(group.deliveries);
    setShowDeliveryModal(true);
  };

  // Efecto para manejar movimiento (simulado en desarrollo, GPS en producción)
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
      // MODO DESARROLLO: Simulación automática
      console.log('[TripMap] Iniciando simulación automática');
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          
          if (nextIndex >= routeCoordinates.length) {
            console.log('[TripMap] Destino alcanzado (simulación)');
            setIsTraveling(false);
            return prevIndex;
          }

          const expectedPosition = routeCoordinates[nextIndex];
          const actualPosition = simulateDeviation(expectedPosition);
          
          setCurrentPosition(actualPosition);
          
          // Centrar mapa en posición actual
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: actualPosition.latitude,
              longitude: actualPosition.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }

          // Actualizar distancia y duración restantes
          const progressPercentage = nextIndex / routeCoordinates.length;
          setRemainingDistance(totalDistance * (1 - progressPercentage));
          setRemainingDuration(totalDuration * (1 - progressPercentage));

          return nextIndex;
        });
      }, 2000); // Actualizar cada 2 segundos
    } else {
      // MODO PRODUCCIÓN: Seguir GPS real
      console.log('[TripMap] Iniciando seguimiento GPS');
      
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
              
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: actualPosition.latitude,
                  longitude: actualPosition.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 1000);
              }

              // Encontrar punto más cercano en la ruta
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

              // Actualizar distancia y duración restantes
              const progressPercentage = closestIndex / routeCoordinates.length;
              setRemainingDistance(totalDistance * (1 - progressPercentage));
              setRemainingDuration(totalDuration * (1 - progressPercentage));

              // Verificar si llegamos al destino
              if (routeCoordinates.length > 0) {
                const lastPoint = routeCoordinates[routeCoordinates.length - 1];
                const distanceToDestination = calculateDistance(actualPosition, lastPoint);
                if (distanceToDestination < 20) {
                  console.log('[TripMap] Destino alcanzado (GPS)');
                  setIsTraveling(false);
                }
              }
            }
          );

          locationSubscription.current = subscription;
        } catch (err) {
          console.error('[TripMap] Error iniciando seguimiento GPS:', err);
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

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

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
        
        {/* Polyline del progreso (ruta recorrida) */}
        {isTraveling && currentIndex > 0 && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates.slice(0, currentIndex + 1)}
            strokeColor="#FFD700" // Dorado
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
              zIndex={1000}
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
        
        {/* Marker de posición actual del mensajero */}
        {currentPosition && (
          <Marker
            key="courier-position"
            coordinate={currentPosition}
            title="Tu posición"
            description={isTraveling ? "En movimiento" : ""}
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

      {/* Controles de viaje */}
      <View style={styles.controlsContainer}>
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
          <TouchableOpacity 
            style={[styles.controlButton, styles.stopButton]} 
            onPress={stopTrip}
          >
            <Text style={styles.controlButtonText}>⏹️ Detener Viaje</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Panel de información */}
      <RouteInfoPanel
        pointsCount={groupedWaypoints.length}
        totalDistance={totalDistance}
        totalDuration={totalDuration}
        isTraveling={isTraveling}
        remainingDistance={remainingDistance}
        remainingDuration={remainingDuration}
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
  
  // Estilos para marker del mensajero
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
  
  // Estilos para controles
  controlsContainer: {
    position: 'absolute',
    bottom: 200,
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
});
