import { StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { socketService, SocketEventType } from '@/services/websocketService';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { DeliveryItemList } from '@/components/delivery-items/DeliveryItemList';
import type { SwipeableRef } from '@/components/delivery-items/DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';
import { deliveryService } from '@/services/deliveryService';
import { IDelivery, IDeliveryDestinyEntity } from '@/interfaces/delivery/delivery';
import { SocketStatusIndicator } from '@/components/socketstatusindicator';
import { DeliveryAssigned } from '@/interfaces/socket/DeliveryAssigned';

// Interfaz adaptada para trabajar con los datos del backend
interface DeliveryItemAdapter {
  id: string;
  title: string;
  client: string;
  phone: string;
  destinies: IDeliveryDestinyEntity[];
}

export default function TabOneScreen() {
  const [deliveries, setDeliveries] = useState<DeliveryItemAdapter[]>([]);
  const [totalDeliveries, setTotalDeliveries] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const swipeableRefs = useRef<Map<string, SwipeableRef>>(new Map());
  const router = useRouter();
  const { setSelectedAddresses } = useAppContext();

  // Cargar entregas desde el backend
  useEffect(() => {
    fetchDeliveries();

    socketService.connect();
    
    const handleDeliveryAssigned = (data: DeliveryAssigned) => {
      const deliveryIdStr = data.deliveryId.toString();

      const deliveryExists = deliveries.some(d => d.id === deliveryIdStr);

      if (deliveryExists) {
        setDeliveries(currentDeliveries =>
          currentDeliveries.map(delivery => {
            if (delivery.id !== deliveryIdStr) return delivery;

            const updatedDestinies = delivery.destinies.map(destiny => {
              if (destiny.id !== data.destiny.id) return destiny;

              return {
                ...destiny,
                deliveryStatus: data.destiny.deliveryStatus
              };
            });

            return {
              ...delivery,
              destinies: updatedDestinies
            };
          })
        );
      } else {
        deliveryService.getDeliveryById(data.deliveryId)
          .then(response => {
            if (response.success && response.data) {
              const newDelivery = mapDeliveries([response.data])[0];

              setDeliveries(current => [newDelivery, ...current]);

              setTotalDeliveries(current => current + 1);

              console.log(`Nueva entrega ${deliveryIdStr} añadida correctamente`);
            } else {
              console.error('Error al cargar la nueva entrega:', response.error);
            }
          })
          .catch(error => {
            console.error('Error al obtener la nueva entrega:', error);
          });
      }
    };

    // Registrar el listener
    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);

    // Limpiar al desmontar
    return () => {
      console.log('Componente desmontado, limpiando listeners y desconectando socket');
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleDeliveryAssigned);
    };
  }, []);

  const mapDeliveries = (deliveries: IDelivery[]): DeliveryItemAdapter[] => {
    return deliveries.map((delivery: IDelivery) => ({
      id: delivery.id.toString(),
      title: `${delivery.provinciaOrigen.nombre},${delivery.sectorOrigen.nombre}, ${delivery.municipioOrigen.nombre}`,      
      client: delivery.contactPerson,
      phone: delivery.contactPhone,
      destinies: delivery.destinies || []
    }));
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await deliveryService.getDeliveries();
      
      if (response.success && response.data) {
        const adaptedDeliveries = mapDeliveries(response.data);
        setDeliveries(adaptedDeliveries);
        setTotalDeliveries(response.total || adaptedDeliveries.length);
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
    }
  };

  const closeAllSwipeables = (exceptId?: string) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId && ref) {
        ref.close();
      }
    });
  };

  const handleEdit = (id: string) => {
    console.log('Editar entrega:', id);
    // Aquí podrías implementar la navegación a una pantalla de edición
    // o abrir un modal para editar la entrega
  };

  const handleDelete = async (id: string) => {
    try {
      const deliveryId = parseInt(id);
      if (isNaN(deliveryId)) {
        console.error('ID de entrega inválido:', id);
        return;
      }

      setLoading(true);

      const response = await deliveryService.deleteDelivery(deliveryId);
      if (response.success) {
        // Actualizar el estado local eliminando la entrega
        setDeliveries(deliveries.filter(item => item.id !== id));
      } else {
        setError(response.error || 'Error al eliminar la entrega');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error al eliminar entrega:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (id: string) => {
    console.log('Añadir destino a entrega:', id);
    // Aquí podrías implementar la navegación a una pantalla para añadir destinos
    // o abrir un modal para añadir destinos a la entrega
  };

  const handlePressItem = (id: string) => {
    const selectedItem = deliveries.find(item => item.id === id);
    console.log(selectedItem);

    if (selectedItem) {      // Adaptar los destinos al formato que espera el AppContext
      const adaptedDestinies = selectedItem.destinies.map(destiny => ({
        id: destiny.id.toString(),
        label: destiny.customerName,
        street: destiny.deliveryAddress,
        city: `${destiny.provincia?.nombre || ''}, ${destiny.municipio?.nombre || ''}, ${destiny.sector?.nombre || ''}`,
        zipCode: '',
        reference: destiny.observations || '',
        status: destiny.deliveryStatus,
        cost: destiny.cost || 0,
      }));
      console.log(adaptedDestinies);

      setSelectedAddresses({
        elementId: selectedItem.id,
        elementTitle: selectedItem.title,
        addresses: adaptedDestinies
      });

      // Navegar a la pantalla modal de direcciones
      router.push("/addresses");
    }
  };

  // Función para crear una nueva entrega
  const addNewDelivery = async () => {
    // Aquí sería ideal navegar a una página de creación de entregas
    // router.push("/create-delivery");

    // Por ahora, mostramos un mensaje de desarrollo
    console.log('Funcionalidad para crear nuevas entregas aún no implementada');
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchDeliveries}>
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
              <TouchableOpacity style={styles.menuButton} onPress={() => console.log('Menú presionado')}>
                <FontAwesome name="bars" size={24} color={CustomColors.textLight} />
              </TouchableOpacity>
              <SocketStatusIndicator />
            </View>
          </View>

        {/* Mostrar indicador de carga si está refrescando datos */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={CustomColors.secondary}
            style={styles.refreshIndicator}
          />
        )}

        <DeliveryItemList
          data={deliveries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
          closeAllSwipeables={closeAllSwipeables}
          swipeableRefs={swipeableRefs}
          onPressItem={handlePressItem}
        />

        <TouchableOpacity style={styles.addButton} onPress={addNewDelivery}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: CustomColors.backgroundMedium,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
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
