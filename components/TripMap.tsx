import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { OsrmTripResult } from '@/services/osrmService';

interface TripMapProps {
  tripData: OsrmTripResult | null;
  loading?: boolean;
  error?: string | null;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

export const TripMap: React.FC<TripMapProps> = ({ tripData, loading, error }) => {
  const [waypoints, setWaypoints] = useState<Coordinate[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) {
      return;
    }

    try {
      const trip = tripData.trips[0];
      
      console.log('[TripMap] Processing trip data:', trip);

      // Extraer waypoints desde la respuesta
      if (tripData.waypoints && tripData.waypoints.length > 0) {
        const waypointCoords: Coordinate[] = tripData.waypoints.map(wp => ({
          latitude: wp.location[1],
          longitude: wp.location[0],
        }));
        setWaypoints(waypointCoords);
        console.log('[TripMap] Waypoints extraídos:', waypointCoords.length);
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
      if (routeCoordinates.length > 0 && mapRef.current) {
        const firstCoord = routeCoordinates[0];
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
  }, [tripData]);

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
  if (!tripData || waypoints.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No hay datos de ruta optimizada para mostrar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: waypoints[0]?.latitude || 0,
          longitude: waypoints[0]?.longitude || 0,
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

        {/* Markers para cada waypoint */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={`waypoint-${index}`}
            coordinate={waypoint}
            pinColor={index === 0 ? 'green' : index === waypoints.length - 1 ? 'red' : 'orange'}
            title={`Punto ${index + 1}`}
            description={
              index === 0
                ? 'Inicio'
                : index === waypoints.length - 1
                ? 'Fin'
                : `Entrega ${index}`
            }
          />
        ))}
      </MapView>

      {/* Panel de información */}
      <View style={styles.infoPanel}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Puntos de entrega:</Text>
          <Text style={styles.infoValue}>{waypoints.length}</Text>
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
    height: Dimensions.get('window').height * 0.7,
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
});
