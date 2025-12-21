import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import polyline from '@mapbox/polyline';
import { OsrmRouteResult } from '@/services/osrmService';
import { useOsrmRoute } from '@/hooks/useOsrmRoute';
import * as Location from 'expo-location';

interface RouteMapProps {
  routeData: OsrmRouteResult | null;
  loading?: boolean;
  error?: string | null;
}

interface DecodedCoordinate {
  latitude: number;
  longitude: number;
}

export const RouteMap: React.FC<RouteMapProps> = ({ routeData, loading, error }) => {
  const [routeCoordinates, setRouteCoordinates] = useState<DecodedCoordinate[]>([]);
  const [origin, setOrigin] = useState<DecodedCoordinate | null>(null);
  const [destination, setDestination] = useState<DecodedCoordinate | null>(null);
  const [currentPosition, setCurrentPosition] = useState<DecodedCoordinate | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [remainingCoordinates, setRemainingCoordinates] = useState<DecodedCoordinate[]>([]);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingDuration, setRemainingDuration] = useState<number>(0);
  
  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  // Hook para recalcular rutas cuando hay desvíos
  const { data: recalculatedRoute, loading: recalculating, fetchRoute } = useOsrmRoute();

  useEffect(() => {
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      return;
    }

    try {
      const route = routeData.routes[0];
      
      // Decodificar la geometría polyline
      if (route.geometry) {
        const decoded = polyline.decode(route.geometry);
        const coordinates: DecodedCoordinate[] = decoded.map((coord: [number, number]) => ({
          latitude: coord[0],
          longitude: coord[1],
        }));
        
        setRouteCoordinates(coordinates);
        setRemainingCoordinates(coordinates);
        
        // Establecer origen y destino
        if (coordinates.length > 0) {
          setOrigin(coordinates[0]);
          setDestination(coordinates[coordinates.length - 1]);
          setCurrentPosition(coordinates[0]);
        }
        
        // Establecer distancia y duración iniciales
        setRemainingDistance(route.distance);
        setRemainingDuration(route.duration);
        
        console.log('[RouteMap] Ruta decodificada con', coordinates.length, 'puntos');
      }
    } catch (err) {
      console.error('[RouteMap] Error decodificando ruta:', err);
    }
  }, [routeData]);

  // Manejar ruta recalculada
  useEffect(() => {
    if (recalculatedRoute && recalculatedRoute.routes && recalculatedRoute.routes.length > 0) {
      try {
        const route = recalculatedRoute.routes[0];
        
        if (route.geometry) {
          const decoded = polyline.decode(route.geometry);
          const coordinates: DecodedCoordinate[] = decoded.map((coord: [number, number]) => ({
            latitude: coord[0],
            longitude: coord[1],
          }));
          
          console.log('[RouteMap] Ruta recalculada con', coordinates.length, 'puntos');
          
          // Actualizar ruta restante
          setRemainingCoordinates(coordinates);
          setRemainingDistance(route.distance);
          setRemainingDuration(route.duration);
          
          // Resetear índice para seguir la nueva ruta
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('[RouteMap] Error decodificando ruta recalculada:', err);
      }
    }
  }, [recalculatedRoute]);

  // Calcular distancia entre dos coordenadas (fórmula Haversine simplificada)
  const calculateDistance = (coord1: DecodedCoordinate, coord2: DecodedCoordinate): number => {
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

  // Simular desvío aleatorio
  const simulateDeviation = (coord: DecodedCoordinate): DecodedCoordinate => {
    // 20% de probabilidad de desvío
    if (Math.random() > 0.8) {
      const deviationAmount = 0.001; // ~110 metros
      return {
        latitude: coord.latitude + (Math.random() - 0.5) * deviationAmount,
        longitude: coord.longitude + (Math.random() - 0.5) * deviationAmount,
      };
    }
    return coord;
  };

  // Detectar si hay desvío significativo
  const isSignificantDeviation = (actualPos: DecodedCoordinate, expectedPos: DecodedCoordinate): boolean => {
    const distance = calculateDistance(actualPos, expectedPos);
    return distance > 50; // Más de 50 metros se considera desvío
  };

  // Recalcular ruta
  const recalculateRoute = async (from: DecodedCoordinate, to: DecodedCoordinate) => {
    console.log('[RouteMap] Recalculando ruta desde', from, 'hasta', to);
    try {
      await fetchRoute({
        origin: from,
        destination: to,
        steps: true,
      });
    } catch (err) {
      console.error('[RouteMap] Error recalculando ruta:', err);
    }
  };

  // Iniciar viaje (simulado en desarrollo, real en producción)
  const startTrip = async () => {
    if (routeCoordinates.length === 0 || !destination) {
      console.log('[RouteMap] No hay ruta para iniciar viaje');
      return;
    }

    if (__DEV__) {
      // Modo desarrollo: simulación automática
      setIsTraveling(true);
      setCurrentIndex(0);
      console.log('[RouteMap] Iniciando viaje simulado (DESARROLLO)');
    } else {
      // Modo producción: seguir GPS del usuario
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('[RouteMap] Permiso de ubicación denegado');
          return;
        }

        setIsTraveling(true);
        setCurrentIndex(0);
        console.log('[RouteMap] Iniciando seguimiento GPS (PRODUCCIÓN)');
      } catch (err) {
        console.error('[RouteMap] Error solicitando permisos:', err);
      }
    }
  };

  // Detener viaje (simulación o GPS)
  const stopTrip = () => {
    setIsTraveling(false);
    
    // Limpiar interval de simulación
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Limpiar subscripción de ubicación
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    console.log('[RouteMap] Viaje detenido');
  };

  // Efecto para manejar movimiento (simulado en desarrollo, GPS en producción)
  useEffect(() => {
    if (!isTraveling || remainingCoordinates.length === 0) {
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
      console.log('[RouteMap] Iniciando simulación automática');
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          
          // Verificar si llegamos al destino
          if (nextIndex >= remainingCoordinates.length) {
            console.log('[RouteMap] Destino alcanzado (simulación)');
            setIsTraveling(false);
            return prevIndex;
          }

          const expectedPosition = remainingCoordinates[nextIndex];
          
          // Simular posible desvío
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

          // Detectar desvío y recalcular si es necesario
          if (isSignificantDeviation(actualPosition, expectedPosition) && destination) {
            console.log('[RouteMap] Desvío detectado, recalculando ruta...');
            recalculateRoute(actualPosition, destination);
          }

          // Actualizar distancia y duración restantes (aproximado)
          const progressPercentage = nextIndex / remainingCoordinates.length;
          
          if (routeData?.routes[0]) {
            setRemainingDistance(routeData.routes[0].distance * (1 - progressPercentage));
            setRemainingDuration(routeData.routes[0].duration * (1 - progressPercentage));
          }

          return nextIndex;
        });
      }, 2000); // Actualizar cada 2 segundos
    } else {
      // MODO PRODUCCIÓN: Seguir GPS real del usuario
      console.log('[RouteMap] Iniciando seguimiento GPS');
      
      (async () => {
        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 2000, // Actualizar cada 2 segundos
              distanceInterval: 10, // O cada 10 metros
            },
            (location) => {
              const actualPosition: DecodedCoordinate = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };

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

              // Encontrar el punto más cercano en la ruta
              let closestIndex = 0;
              let minDistance = Infinity;
              
              remainingCoordinates.forEach((coord, index) => {
                const distance = calculateDistance(actualPosition, coord);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = index;
                }
              });

              setCurrentIndex(closestIndex);

              // Detectar desvío significativo y recalcular
              const closestPoint = remainingCoordinates[closestIndex];
              if (isSignificantDeviation(actualPosition, closestPoint) && destination) {
                console.log('[RouteMap] Desvío detectado (GPS), recalculando ruta...');
                recalculateRoute(actualPosition, destination);
              }

              // Actualizar distancia y duración restantes
              const progressPercentage = closestIndex / remainingCoordinates.length;
              
              if (routeData?.routes[0]) {
                setRemainingDistance(routeData.routes[0].distance * (1 - progressPercentage));
                setRemainingDuration(routeData.routes[0].duration * (1 - progressPercentage));
              }

              // Verificar si llegamos al destino
              if (destination) {
                const distanceToDestination = calculateDistance(actualPosition, destination);
                if (distanceToDestination < 20) { // Menos de 20 metros
                  console.log('[RouteMap] Destino alcanzado (GPS)');
                  setIsTraveling(false);
                }
              }
            }
          );

          locationSubscription.current = subscription;
        } catch (err) {
          console.error('[RouteMap] Error iniciando seguimiento GPS:', err);
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
  }, [isTraveling, remainingCoordinates, destination, routeData]);

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

  // Mostrar loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.secondary} />
        <Text style={styles.loadingText}>Cargando ruta...</Text>
      </View>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Si no hay datos de ruta
  if (!routeData || routeCoordinates.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No hay datos de ruta para mostrar</Text>
      </View>
    );
  }

  // Calcular la región inicial del mapa
  const initialRegion = origin ? {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Tiles usando CartoDB como alternativa a OSM */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* Polyline de la ruta restante */}
        {remainingCoordinates.length > 0 && (
          <Polyline
            coordinates={remainingCoordinates}
            strokeColor={CustomColors.primary}
            strokeWidth={4}
          />
        )}

        {/* Polyline del progreso (ruta recorrida) */}
        {isTraveling && currentIndex > 0 && (
          <Polyline
            coordinates={routeCoordinates.slice(0, currentIndex + 1)}
            strokeColor="#00FF00"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* Marker de origen */}
        {origin && (
          <Marker
            coordinate={origin}
            title="Origen"
            pinColor="green"
          />
        )}

        {/* Marker de destino */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destino"
            pinColor="red"
          />
        )}

        {/* Marker de posición actual del usuario */}
        {currentPosition && (
          <Marker
            coordinate={currentPosition}
            title="Tu posición"
            description={isTraveling ? "En movimiento" : ""}
            pinColor="blue"
          />
        )}
      </MapView>

      {/* Panel de información y controles */}
      <View style={styles.infoContainer}>
        {/* Botones de control */}
        <View style={styles.controlsContainer}>
          {!isTraveling ? (
            <TouchableOpacity 
              style={[styles.controlButton, styles.startButton]} 
              onPress={startTrip}
              disabled={!routeData || routeCoordinates.length === 0}
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

        {/* Información de la ruta */}
        {routeData && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distancia restante:</Text>
              <Text style={styles.statValue}>
                {(remainingDistance / 1000).toFixed(2)} km
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tiempo restante:</Text>
              <Text style={styles.statValue}>
                {Math.round(remainingDuration / 60)} min
              </Text>
            </View>
            {isTraveling && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Estado:</Text>
                <Text style={[styles.statValue, styles.statusActive]}>
                  🔵 En movimiento
                </Text>
              </View>
            )}
            {recalculating && (
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, styles.recalculating]}>
                  🔄 Recalculando ruta...
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
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
    height: Dimensions.get('window').height - 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  loadingText: {
    color: CustomColors.textLight,
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomColors.backgroundDarkest,
    padding: 20,
  },
  errorText: {
    color: CustomColors.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: CustomColors.backgroundDark,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: CustomColors.textLight + '20',
    minHeight: 150,
  },
  controlsContainer: {
    marginBottom: 15,
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  controlButtonText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: CustomColors.textLight,
    fontSize: 14,
    opacity: 0.8,
  },
  statValue: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#4CAF50',
  },
  recalculating: {
    color: '#FFA500',
    fontStyle: 'italic',
  },
});
