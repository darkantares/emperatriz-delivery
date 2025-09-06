import { StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { socketService, SocketEventType } from '@/services/websocketService';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useRef, useEffect } from 'react';
import { DeliveryItemList } from '@/components/delivery-items/DeliveryItemList';
import { CustomColors } from '@/constants/CustomColors';
import { deliveryService } from '@/services/deliveryService';
import { SocketStatusIndicator } from '@/components/socketstatusindicator';
import { IDeliveryAssignmentEntity, IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { IProvincia, IMunicipio, ISector } from '@/interfaces/location';
import { AssignmentType } from '@/utils/enum';
import { StatusUpdateModal } from '@/components/modals/StatusUpdateModal';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';

// Interfaz adaptada para trabajar con los datos del backend
interface DeliveryItemAdapter {
  id: string;
  title: string;
  client: string;
  phone: string;
  type: AssignmentType;
  deliveryStatus: IDeliveryStatusEntity;
  deliveryAddress: string;
  observations?: string;
  provincia: IProvincia;
  municipio: IMunicipio;
  origin: ISector;
  destiny: ISector;
  fee: number;
  cost: number;
}

export default function TabOneScreen() {
  const [deliveries, setDeliveries] = useState<DeliveryItemAdapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState<boolean>(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItemAdapter | null>(null);

  const isNavigating = useRef(false);

  // Cargar entregas al montar
  useEffect(() => {
    fetchDeliveries();
  }, []);

  // Conectar socket y listeners
  useEffect(() => {
    socketService.connect();
    
    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);
    socketService.on(SocketEventType.DELIVERY_REORDERED, handleDeliveryReordered); 

    return () => {
      console.log('Componente desmontado, limpiando listeners y desconectando socket');
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);
      socketService.off(SocketEventType.DELIVERY_REORDERED, handleDeliveryReordered);
    };
  }, []);
  
  const handleDeliveryAssigned = (data: any) => {
    console.log(data);
      
    // Agregar la data recibida directamente al array de entregas
    setDeliveries(currentDeliveries => [...currentDeliveries, mapDelivery(data)]);
  };

  const handleDeliveryReordered = (data: IDeliveryAssignmentEntity[]) => {
    console.log(data);
      
    // Agregar la data recibida directamente al array de entregas
    setDeliveries([...data.map(mapDelivery)]);
  };

  const mapDelivery = (delivery: IDeliveryAssignmentEntity): DeliveryItemAdapter => {
    return {
      id: delivery.id.toString(),
      title: `${delivery.provincia.nombre}, ${delivery.municipio.nombre}, ${delivery.origin.nombre}`,      
      client: delivery.contact,
      phone: delivery.phone,
      type: delivery.type,
      deliveryStatus: delivery.deliveryStatus,
      deliveryAddress: delivery.deliveryAddress,
      observations: delivery.observations,
      provincia: delivery.provincia,
      municipio: delivery.municipio,
      origin: delivery.origin,
      destiny: delivery.destiny,
      fee: delivery.fee,
      cost: delivery.cost
    };
  };

  const fetchDeliveries = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await deliveryService.getDeliveries();
      
      if (response.success && response.data) {
        const adaptedDeliveries = response.data.map(delivery => mapDelivery(delivery));
        setDeliveries(adaptedDeliveries);
      } else {
        setError(response.error || 'Error al cargar las entregas');
        console.error('Error al cargar entregas: 1', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al cargar entregas 2:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries(true);
  };

  const handlePressItem = (id: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    const selectedItem = deliveries.find(item => item.id === id);
    if (selectedItem) {
      // Guardar el delivery seleccionado y mostrar el modal de actualización de estado
      setSelectedDelivery(selectedItem);
      setIsStatusModalVisible(true);
      
      // Restablecer la bandera de navegación
      setTimeout(() => { isNavigating.current = false; }, 500);
    } else {
      isNavigating.current = false;
    }
  };

  // Manejar la actualización de estado
  const handleStatusUpdate = async (newStatus: string) => {
    if (selectedDelivery) {
      try {
        // Actualizar la entrega en el estado local
        setDeliveries(currentDeliveries => 
          currentDeliveries.map(delivery => 
            delivery.id === selectedDelivery.id 
              ? { 
                  ...delivery, 
                  deliveryStatus: { 
                    ...delivery.deliveryStatus, 
                    title: newStatus as IDeliveryStatus 
                  } 
                } 
              : delivery
          )
        );
      } catch (error) {
        console.error('Error al actualizar el estado localmente:', error);
      }
    }
  };

  // Renderizar indicador de carga mientras se obtienen los datos
  if (loading && deliveries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.secondary} />
        <Text style={styles.loadingText}>Cargando entregas...</Text>
      </View>
    );
  }

  // Renderizar mensaje de error si ocurrió alguno
  if (error && deliveries.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchDeliveries()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => console.log('Menú presionado')}
                activeOpacity={0.7}
              >
                <FontAwesome name="bars" size={24} color={CustomColors.textLight} />
              </TouchableOpacity>
              <SocketStatusIndicator />
            </View>
          </View>

          {/* Mostrar indicador de carga si está refrescando datos y no es pull-to-refresh */}
          {loading && !refreshing && (
            <ActivityIndicator
              size="small"
              color={CustomColors.secondary}
              style={styles.refreshIndicator}
            />
          )}
          {/* mostrar card aqui */}


          {/* Lista de entregas */}
          <DeliveryItemList
            data={deliveries}
            onPressItem={handlePressItem}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />

        {/* <TouchableOpacity style={styles.addButton} onPress={() => console.log('Botón de agregar presionado')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity> */}
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: CustomColors.backgroundMedium,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
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
  menuButton: {
    padding: 8,
    zIndex: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  refreshIndicator: {
    marginBottom: 15,
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
});
