import { StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { socketService, SocketEventType } from '@/services/websocketService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useRef, useEffect } from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { StatusUpdateModal } from '@/components/modals/StatusUpdateModal';
import { Greeting } from '@/components/dashboard/Greeting';
import { AppHeader } from '@/components/header/AppHeader';
import { AppStateScreen } from '@/components/states/AppStateScreen';
import { useAuth } from '@/context/AuthContext';
import { useActiveDelivery } from '@/context/ActiveDeliveryContext';
import { useDelivery } from '@/context/DeliveryContext';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { ActiveDeliveryCard } from '@/components/dashboard/ActiveDeliveryCard';
import { DeliveryItemList } from '@/components/delivery-items/DeliveryItemList';

export default function TabOneScreen() {
  const { user } = useAuth();
  const { getNextDeliveryToProcess, canProcessNewDelivery } = useActiveDelivery();
  const { 
    deliveries, 
    inProgressDelivery, 
    loading, 
    refreshing, 
    error, 
    onRefresh,
    fetchDeliveries,
    handleDeliveryUpdated,
    handleDeliveryAssigned,
    handleDeliveryReordered
  } = useDelivery();
  
  const [isStatusModalVisible, setIsStatusModalVisible] = useState<boolean>(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItemAdapter | null>(null);

  const isNavigating = useRef(false);

  // Conectar socket y listeners
  useEffect(() => {
    socketService.connect();
    
    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);
    socketService.on(SocketEventType.DELIVERY_REORDERED, handleDeliveryReordered); 
    socketService.on(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, handleDeliveryUpdated);

    return () => {
      console.log('Componente desmontado, limpiando listeners y desconectando socket');
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);
      socketService.off(SocketEventType.DELIVERY_REORDERED, handleDeliveryReordered);
      socketService.off(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, handleDeliveryUpdated);  
    };
  }, [handleDeliveryAssigned, handleDeliveryReordered, handleDeliveryUpdated]);

  const handlePressItem = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    // Obtener el siguiente delivery a procesar
    const nextDelivery = getNextDeliveryToProcess(deliveries);
    
    if (!nextDelivery) {
      Alert.alert(
        "Sin entregas",
        "No hay entregas disponibles para procesar.",
        [{ text: "Entendido" }]
      );
      isNavigating.current = false;
      return;
    }

    // Verificar si se puede procesar un nuevo delivery
    if (!canProcessNewDelivery(deliveries)) {
      Alert.alert(
        "Entrega en Progreso",
        "Ya tienes una entrega en progreso. Debes completarla antes de iniciar otra.",
        [{ text: "Entendido" }]
      );
      isNavigating.current = false;
      return;
    }
    
    // Guardar el delivery seleccionado y mostrar el modal de actualización de estado
    setSelectedDelivery(nextDelivery);
    setIsStatusModalVisible(true);
    
    // Restablecer la bandera de navegación
    setTimeout(() => { isNavigating.current = false; }, 500);
  };

  // Manejar la actualización de estado
  const handleStatusUpdate = async (newStatus: string) => {
    // El modal ya se encarga de llamar al backend y actualizar el contexto
    // Solo necesitamos cerrar el modal aquí
    setIsStatusModalVisible(false);
    setSelectedDelivery(null);
  };


  // Renderizar indicador de carga mientras se obtienen los datos
  if (loading && deliveries.length === 0 && !inProgressDelivery) {
    return (
      <AppStateScreen 
        type="loading" 
        onRetry={() => fetchDeliveries()} 
      />
    );
  }

  // Renderizar mensaje de error si ocurrió alguno
  if (error && deliveries.length === 0 && !inProgressDelivery) {
    return (
      <AppStateScreen 
        type="error" 
        error={error}
        onRetry={() => fetchDeliveries()} 
      />
    );
  }

  // Si no hay entregas y no hay error ni loading, mostrar el saludo y mensaje central
  if (!loading && !error && deliveries.length === 0 && !inProgressDelivery) {
    return (
      <AppStateScreen 
        type="noDeliveries" 
        userName={user ? `${user.firstname} ${user.lastname}` : ""}
        onRetry={() => fetchDeliveries()} 
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        <View style={styles.container}>
          <AppHeader />

          {/* Mostrar indicador de carga si está refrescando datos y no es pull-to-refresh */}
          {loading && !refreshing && (
            <ActivityIndicator
              size="small"
              color={CustomColors.secondary}
              style={styles.refreshIndicator}
            />
          )}
          
          {/* Saludo */}
          <Greeting userName={user ? `${user.firstname} ${user.lastname}` : ""} />
          {/* Tarjeta de progreso de entregas */}
          <ProgressCard 
            userName={user ? `${user.firstname} ${user.lastname}` : ""}
            deliveries={deliveries}
            inProgressDelivery={inProgressDelivery}
          />
          
          {/* Tarjeta de entrega en progreso */}
          <ActiveDeliveryCard 
            inProgressDelivery={inProgressDelivery}
            onViewTask={() => {
              if (inProgressDelivery) {
                setSelectedDelivery(inProgressDelivery);
                setIsStatusModalVisible(true);
              }
            }}
          />

          {/* Lista de entregas */}
          <DeliveryItemList
            data={deliveries}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />

          <TouchableOpacity 
            style={[
              styles.progressButton,
              (inProgressDelivery !== null || !canProcessNewDelivery(deliveries)) && styles.progressButtonDisabled
            ]} 
            onPress={handlePressItem}
            disabled={inProgressDelivery !== null || !canProcessNewDelivery(deliveries)}
          >
            <Text style={styles.progressButtonText}>
              {inProgressDelivery !== null ? 'Completa entrega actual' : 'Progresar Envío'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal de Actualización de Estado */}
        {selectedDelivery && (
          <StatusUpdateModal
            isVisible={isStatusModalVisible}
            onClose={() => setIsStatusModalVisible(false)}
            currentStatus={selectedDelivery.deliveryStatus.title}
            onStatusSelected={handleStatusUpdate}
            itemId={selectedDelivery.id}
          />
        )}

        {/* Botón manual para refrescar entregas, fuera del View principal */}
        <TouchableOpacity
          style={styles.manualRefreshButton}
          onPress={() => fetchDeliveries()}
        >
          <Text style={styles.manualRefreshButtonText}>Refrescar entregas</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({

  deliveryInfoContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: CustomColors.backgroundDark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  infoValue: {
    color: CustomColors.textLight,
    fontSize: 14,
    flex: 1,
  },
  clientCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CustomColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clientInitial: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: CustomColors.textLight,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 10,
    width: '90%',
  },
  addButton: {
    backgroundColor: CustomColors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginVertical: 20,
    elevation: 5,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  addButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressButton: {
    backgroundColor: CustomColors.secondary,
    paddingVertical: 14,
    // paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
    elevation: 5,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    position: 'absolute',
    bottom: 10, // antes 20, ahora más abajo
    right: 20,
    left: 20,
  },
  progressButtonDisabled: {
    backgroundColor: CustomColors.divider,
    opacity: 0.6,
  },
  progressButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  refreshIndicator: {
    marginBottom: 15,
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
    manualRefreshButtonText: {
      color: CustomColors.textLight,
      fontWeight: 'bold',
      fontSize: 16,
    },
});
