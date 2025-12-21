import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, SafeAreaView, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CustomColors } from '@/constants/CustomColors';
import { useOsrmRoute } from '@/hooks/useOsrmRoute';
import * as Location from 'expo-location';
import { RouteMap } from '@/components/RouteMap';

interface AppStateScreenProps {
  type: 'loading' | 'error' | 'noDeliveries';
  error?: string;
  onRetry: () => void;
}

export const AppStateScreen: React.FC<AppStateScreenProps> = ({
  type,
  error,
  onRetry
}) => {
  const { data: routeData, loading: routeLoading, error: routeError, fetchRoute } = useOsrmRoute();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  // Obtener ubicación actual al montar el componente
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[AppStateScreen] Permiso de ubicación denegado');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('[AppStateScreen] Ubicación actual obtenida:', location.coords);
      } catch (err) {
        console.error('[AppStateScreen] Error obteniendo ubicación:', err);
      }
    })();
  }, []);

  const handleTestRoute = async () => {
    if (!currentLocation) {
      console.log('[AppStateScreen] No se ha obtenido la ubicación actual aún');
      return;
    }

    // Coordenadas de destino desde la URL: https://www.google.com/maps?q=18.4928592,-69.7826263
    const destination = {
      latitude: 18.4928592,
      longitude: -69.7826263,
    };

    console.log('[AppStateScreen] Consultando ruta desde:', currentLocation, 'hasta:', destination);

    await fetchRoute({
      origin: currentLocation,
      destination: destination,
      steps: true,
    });
  };

  // Mostrar resultado en consola cuando se obtenga
  useEffect(() => {
    if (routeData) {
      console.log('[AppStateScreen] Ruta OSRM obtenida:', JSON.stringify(routeData, null, 2));
    }
    if (routeError) {
      console.error('[AppStateScreen] Error en ruta OSRM:', routeError);
    }
  }, [routeData, routeError]);

  const renderContent = () => {
    switch (type) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={CustomColors.secondary} />
            <Text style={styles.loadingText}>Cargando entregas...</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Reintentard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'noDeliveries':
        return (
          <View style={styles.container}>
            <View style={styles.noDeliveriesContainer}>
              <Text style={styles.noDeliveriesText}>No tienes envíos asignados actualmente</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        {renderContent()}
        
        {/* Botón manual para refrescar entregas solo en desarrollo */}
        {__DEV__ && (
          <>
            <TouchableOpacity
              style={styles.manualRefreshButton}
              onPress={onRetry}
            >
              <Text style={styles.manualRefreshButtonText}>Refrescar entregas</Text>
            </TouchableOpacity>

            {/* Botón para probar ruta OSRM */}
            <TouchableOpacity
              style={[styles.manualRefreshButton, styles.testRouteButton]}
              onPress={handleTestRoute}
              disabled={routeLoading || !currentLocation}
            >
              <Text style={styles.manualRefreshButtonText}>
                {routeLoading ? 'Consultando ruta...' : !currentLocation ? 'Obteniendo ubicación...' : 'Probar Ruta OSRM'}
              </Text>
            </TouchableOpacity>

            {/* Botón para ver mapa */}
            {routeData && (
              <TouchableOpacity
                style={[styles.manualRefreshButton, styles.mapButton]}
                onPress={() => setShowMap(true)}
              >
                <Text style={styles.manualRefreshButtonText}>Ver Mapa</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Modal con el mapa */}
        <Modal
          visible={showMap}
          animationType="slide"
          onRequestClose={() => setShowMap(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ruta en Mapa</Text>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <Text style={styles.closeButton}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            
            <RouteMap 
              routeData={routeData} 
              loading={routeLoading} 
              error={routeError} 
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  noDeliveriesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noDeliveriesText: {
    color: CustomColors.textLight,
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 30,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: CustomColors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
  },
  manualRefreshButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    alignItems: 'center',
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 70,
    zIndex: 99,
  },
  testRouteButton: {
    bottom: 150, // Posicionar encima del botón de refrescar
    backgroundColor: CustomColors.secondary,
  },
  mapButton: {
    bottom: 230, // Posicionar encima del botón de probar ruta
    backgroundColor: '#4CAF50',
  },
  manualRefreshButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + '20',
  },
  modalTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: CustomColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});