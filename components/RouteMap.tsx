import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import polyline from '@mapbox/polyline';
import { OsrmRouteResult } from '@/services/osrmService';

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
        
        // Establecer origen y destino
        if (coordinates.length > 0) {
          setOrigin(coordinates[0]);
          setDestination(coordinates[coordinates.length - 1]);
        }
      }
    } catch (err) {
      console.error('[RouteMap] Error decodificando ruta:', err);
    }
  }, [routeData]);

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
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Tiles de OpenStreetMap */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* Polyline de la ruta */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={CustomColors.primary}
            strokeWidth={4}
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
      </MapView>

      {/* Información de la ruta */}
      {routeData.routes[0] && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Distancia: {(routeData.routes[0].distance / 1000).toFixed(2)} km
          </Text>
          <Text style={styles.infoText}>
            Duración: {Math.round(routeData.routes[0].duration / 60)} min
          </Text>
        </View>
      )}
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
    height: Dimensions.get('window').height * 0.6, // 60% de la altura de la pantalla
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
  },
  infoText: {
    color: CustomColors.textLight,
    fontSize: 14,
    marginVertical: 2,
  },
});
