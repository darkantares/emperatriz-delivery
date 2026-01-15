import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomColors } from '@/constants/CustomColors';
import { useOsrmRoute } from '@/hooks/useOsrmRoute';

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
  const { data: routeData, error: routeError } = useOsrmRoute();
  const [showMap, setShowMap] = useState<boolean>(false);

  // Mostrar resultado en consola cuando se obtenga y abrir modal automáticamente
  useEffect(() => {
    if (routeData) {
      console.log('[AppStateScreen] Ruta OSRM obtenida. Abriendo mapa...');
      setShowMap(true);
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
              <Text style={styles.retryButtonText}>Reintentar</Text>
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