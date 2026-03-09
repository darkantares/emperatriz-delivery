import {
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import { View } from "@/components/Themed";
import { socketService, SocketEventType } from "@/services/websocketService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { CustomColors } from "@/constants/CustomColors";
import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { AppStateScreen } from "@/components/states/AppStateScreen";
import { useActiveDelivery } from "@/context/ActiveDeliveryContext";
import { useDelivery } from "@/context/DeliveryContext";
import {
  DeliveryItemAdapter,
  DeliveryGroupAdapter,
  groupDeliveriesByShipment,
} from "@/interfaces/delivery/deliveryAdapters";
import { ActiveDeliveryCard } from "@/components/ActiveDeliveryCard";
import { DeliveryItemList } from "@/components/delivery-items/DeliveryItemList";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { useRouteContext } from "@/contexts/RouteContext";
import StatusUpdateModal from '@/components/status-update/StatusUpdateModal';

function TabOneScreenContent() {
  const { canProcessNewDelivery } = useActiveDelivery();  
  const pendingRouteRefreshRef = useRef(false);
  const {
    deliveries,
    inProgressDelivery,
    allDeliveries,
    loading,
    refreshing,
    error,
    onRefresh,
    fetchDeliveries,
    handleDeliveryUpdated,
    handleDeliveryAssigned,
    handleDeliveryReordered,
    handleDriversGroupAssigned,
  } = useDelivery();

  const {
    tripLoading,
    startRoutes,
    recalculateRoutes,
  } = useRouteContext();

  const handlersRef = useRef({
    onDriverAssigned: (data: any) => {
      console.log(data);
      handleDeliveryAssigned(data);
      pendingRouteRefreshRef.current = true;
    },
    onDriversGroupAssigned: (data: any) => {
      console.log(data);
      handleDriversGroupAssigned(data);
      pendingRouteRefreshRef.current = true;
    },
    onDeliveryReordered: (data: any) => {
      handleDeliveryReordered(data);
    },
    onDeliveryUpdated: (data: any) => {
      handleDeliveryUpdated(data);
    },
  });

  useEffect(() => {
    handlersRef.current = {
      onDriverAssigned: (data: any) => {
        console.log(data);
        handleDeliveryAssigned(data);
        pendingRouteRefreshRef.current = true;
      },
      onDriversGroupAssigned: (data: any) => {
        console.log(data);
        handleDriversGroupAssigned(data);
        pendingRouteRefreshRef.current = true;
      },
      onDeliveryReordered: (data: any) => {
        handleDeliveryReordered(data);
      },
      onDeliveryUpdated: (data: any) => {
        handleDeliveryUpdated(data);
      },
    };
  }, [
    handleDeliveryAssigned,
    handleDriversGroupAssigned,
    handleDeliveryReordered,
    handleDeliveryUpdated,
  ]);

  // Conectar socket y listeners una sola vez
  useEffect(() => {
    socketService.connect();

    const onDriverAssigned = (data: any) => handlersRef.current.onDriverAssigned(data);
    const onDeliveryReordered = (data: any) => handlersRef.current.onDeliveryReordered(data);
    const onDeliveryUpdated = (data: any) => handlersRef.current.onDeliveryUpdated(data);
    const onDriversGroupAssigned = (data: any) => handlersRef.current.onDriversGroupAssigned(data);

    socketService.on(SocketEventType.DRIVER_ASSIGNED, onDriverAssigned);
    socketService.on(SocketEventType.DELIVERY_REORDERED, onDeliveryReordered);
    socketService.on(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, onDeliveryUpdated);
    socketService.on(SocketEventType.DRIVERS_GROUP_ASSIGNED, onDriversGroupAssigned);

    return () => {
      socketService.off(SocketEventType.DRIVER_ASSIGNED, onDriverAssigned);
      socketService.off(SocketEventType.DELIVERY_REORDERED, onDeliveryReordered);
      socketService.off(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, onDeliveryUpdated);
      socketService.off(SocketEventType.DRIVERS_GROUP_ASSIGNED, onDriversGroupAssigned);
    };
  }, []);

  // Type guard para verificar si el item es un grupo
  const isDeliveryGroup = (
    item: DeliveryItemAdapter | any
  ): item is DeliveryGroupAdapter => {
    return "shipmentId" in item && "pickups" in item && "delivery" in item;
  };

  // Función para obtener el siguiente delivery a procesar (individual o de grupo)
  const getDeliveryFromGroup = (
    deliveries: DeliveryItemAdapter[]
  ): DeliveryItemAdapter | null => {
    // Primero agrupar las entregas
    const processedData = groupDeliveriesByShipment(deliveries);

    const completedStatuses = [
      IDeliveryStatus.RETURNED,
      IDeliveryStatus.CANCELLED,
      IDeliveryStatus.DELIVERED,
    ];

    // Buscar el primer grupo o entrega individual que se pueda procesar
    for (const item of processedData) {
      if (isDeliveryGroup(item)) {
        // Es un grupo - verificar el estado de progreso
        const group = item as DeliveryGroupAdapter;

        // Verificar si hay pickups pendientes
        const pendingPickups = group.pickups.filter(
          (pickup) =>
            !completedStatuses.includes(
              pickup.deliveryStatus.title as IDeliveryStatus
            )
        );

        // Si hay pickups pendientes, devolver el primero
        if (pendingPickups.length > 0) {
          return pendingPickups[0];
        }

        // Si todos los pickups están completos, verificar el delivery
        const allPickupsCompleted = group.pickups.every(
          (pickup) =>
            pickup.deliveryStatus.title === IDeliveryStatus.DELIVERED ||
            completedStatuses.includes(
              pickup.deliveryStatus.title as IDeliveryStatus
            )
        );

        if (
          allPickupsCompleted &&
          !completedStatuses.includes(
            group.delivery.deliveryStatus.title as IDeliveryStatus
          )
        ) {
          return group.delivery; // Retornar el delivery final del grupo
        }
      } else {
        // Es una entrega individual
        const delivery = item as DeliveryItemAdapter;

        if (
          !completedStatuses.includes(
            delivery.deliveryStatus.title as IDeliveryStatus
          )
        ) {
          return delivery;
        }
      }
    }

    return null;
  };

  const isNavigating = useRef(false);

  const handleStartRoutes = async () => {
    try {
      await startRoutes(allDeliveries);
    } catch (err) {
      console.log('[TabOneScreen] Error al iniciar rutas:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido al calcular la ruta optimizada.';
      Alert.alert(
        "Error",
        errorMessage,
        [{ text: "Entendido" }]
      );
    }
  };

  // Modal state for status update
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusModalParams, setStatusModalParams] = useState<{
    itemId: string;
    itemTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>(null);

  // Handle navigation back from trip-map screen with a delivery to progress
  const params = useLocalSearchParams<{
    openStatusFor?: string;
    itemTitle?: string;
    currentStatus?: string;
    totalAmount?: string;
  }>();

  useEffect(() => {
    if (params.openStatusFor) {
      setStatusModalParams({
        itemId: params.openStatusFor,
        itemTitle: params.itemTitle ?? '',
        currentStatus: params.currentStatus ?? '',
        totalAmount: parseFloat(params.totalAmount ?? '0') || 0,
      });
      setStatusModalVisible(true);
    }
  }, [params.openStatusFor]);

  const openStatusModal = (delivery: DeliveryItemAdapter) => {
    const total = (delivery.deliveryCost || 0) + (delivery.amountToBeCharged || 0);
    setStatusModalParams({
      itemId: delivery.id,
      itemTitle: delivery.client,
      currentStatus: delivery.deliveryStatus.title,
      totalAmount: total,
    });
    setStatusModalVisible(true);
  };

  const closeStatusModal = () => {
    setStatusModalVisible(false);
    setStatusModalParams(null);
  };

  const handlePressItem = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    // Si hay un envío en progreso, abrir modal para continuar ese envío
    if (inProgressDelivery) {
      openStatusModal(inProgressDelivery);
      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
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

    // Obtener el siguiente delivery a procesar (considerando grupos)
    const nextDelivery = getDeliveryFromGroup(deliveries);
    
    if (!nextDelivery) {
      Alert.alert(
        "Sin entregas",
        "No hay entregas disponibles para procesar.",
        [{ text: "Entendido" }]
      );
      isNavigating.current = false;
      return;
    }

    // Guardar el delivery seleccionado y mostrar el modal de actualización de estado
    openStatusModal(nextDelivery);

    // Restablecer la bandera de navegación
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  // Renderizar indicador de carga mientras se obtienen los datos
  if (loading && deliveries.length === 0 && !inProgressDelivery) {
    return <AppStateScreen type="loading" onRetry={() => fetchDeliveries()} />;
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
      <AppStateScreen type="noDeliveries" onRetry={() => fetchDeliveries()} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}
      >
        <View style={styles.container}>
          <AppHeader />

          {loading && !refreshing && (
            <ActivityIndicator
              size="small"
              color={CustomColors.secondary}
              style={styles.refreshIndicator}
            />
          )}

          <ActiveDeliveryCard
            inProgressDelivery={inProgressDelivery}
            onViewTask={() => {
              if (inProgressDelivery) {
                openStatusModal(inProgressDelivery);
              }
            }}
          />

          <DeliveryItemList
            data={deliveries}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={{ paddingBottom: 180 }}
            onProgress={!inProgressDelivery ? handlePressItem : undefined}
          />

          {/* Botón "Iniciar Rutas" - solo visible si hay deliveries disponibles */}
          {deliveries.length > 0 && (
            <TouchableOpacity
              style={[
                styles.startRoutesButton,
                tripLoading && styles.startRoutesButtonDisabled
              ]}
              onPress={handleStartRoutes}
              disabled={tripLoading}
            >
              <Text style={styles.startRoutesButtonText}>
                {tripLoading ? 'Calculando ruta...' : 'Iniciar Rutas'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {statusModalParams && (
          <StatusUpdateModal
            visible={statusModalVisible}
            onClose={closeStatusModal}
            itemId={statusModalParams.itemId}
            itemTitle={statusModalParams.itemTitle}
            currentStatus={statusModalParams.currentStatus}
            totalAmount={statusModalParams.totalAmount}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

export default function TabOneScreen() {
  return <TabOneScreenContent />;
}

const styles = StyleSheet.create({
  deliveryInfoContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: CustomColors.backgroundDark,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  infoLabel: {
    color: CustomColors.textLight,
    fontWeight: "bold",
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  clientInitial: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: "bold",
  },

  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: CustomColors.backgroundDarkest
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: CustomColors.textLight,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 10,
    width: "90%",
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
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  addButtonText: {
    color: CustomColors.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
  progressButton: {
    backgroundColor: CustomColors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
    elevation: 5,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    marginHorizontal: 20, // Añadir para centrar y dar espacio
  },
  progressButtonDisabled: {
    backgroundColor: CustomColors.divider,
    opacity: 0.6,
  },
  progressButtonText: {
    color: CustomColors.textLight,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
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
    },
  manualRefreshButtonText: {
    color: CustomColors.textLight,
    paddingHorizontal: 20,
    fontWeight: "bold",
    fontSize: 16,
  },
  startRoutesButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginVertical: 20,
    marginHorizontal: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  startRoutesButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
  startRoutesButtonDisabled: {
    backgroundColor: CustomColors.divider,
    opacity: 0.6,
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
