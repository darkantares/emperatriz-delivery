import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CustomColors } from '@/constants/CustomColors';
import { TripMap } from '@/components/TripMap';
import { useRouteContext } from '@/contexts/RouteContext';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

/**
 * Pantalla de mapa con ruta optimizada.
 * Se navega a ella desde index cuando el usuario presiona "Iniciar Rutas".
 * Los datos provienen de RouteContext.
 */
export default function TripMapScreen() {
  const { tripData, tripLoading, tripError, tripDeliveries, closeTripMap } = useRouteContext();

  const handleClose = () => {
    closeTripMap();
    router.back();
  };

  const handleProgressDelivery = (delivery: DeliveryItemAdapter) => {
    router.back();
    // Push status-update params through router so index can open the modal.
    // We navigate back first and then push to let index handle the modal.
    router.navigate({
      pathname: '/',
      params: {
        openStatusFor: delivery.id,
        itemTitle: delivery.client,
        currentStatus: delivery.deliveryStatus.title,
        totalAmount: String(
          (delivery.deliveryCost || 0) + (delivery.amountToBeCharged || 0)
        ),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ruta Optimizada</Text>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.closeButton}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <TripMap
        tripData={tripData}
        loading={tripLoading}
        error={tripError}
        deliveries={tripDeliveries}
        onProgressDelivery={handleProgressDelivery}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + '20',
  },
  headerTitle: {
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
