import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { DeliveryItemAdapter, DeliveryGroupAdapter, groupDeliveriesByShipment } from '@/interfaces/delivery/deliveryAdapters';

interface ProgressCardProps {
  userName: string;
  deliveries: DeliveryItemAdapter[];
  inProgressDelivery?: DeliveryItemAdapter | null;
  onPressViewTask?: () => void;
}

export const ProgressCard = ({ userName, deliveries, inProgressDelivery, onPressViewTask }: ProgressCardProps) => {
  // Type guard para verificar si el item es un grupo
  const isDeliveryGroup = (item: DeliveryItemAdapter | DeliveryGroupAdapter): item is DeliveryGroupAdapter => {
    return 'shipmentId' in item && 'pickups' in item && 'delivery' in item;
  };

  // Calcular el porcentaje de entregas completadas (considerando grupos)
  const calculateProgress = () => {
    // Crear un array con todas las entregas (incluyendo la que está en progreso)
    const allDeliveries = [...deliveries];
    if (inProgressDelivery) {
      allDeliveries.push(inProgressDelivery);
    }
    
    if (allDeliveries.length === 0) return 100;
    
    // Agrupar las entregas para obtener el total real de "unidades de trabajo"
    const processedData = groupDeliveriesByShipment(allDeliveries);
    
    if (processedData.length === 0) return 100;
    
    const completedStatuses = [
      IDeliveryStatus.DELIVERED,
      IDeliveryStatus.RETURNED,
      IDeliveryStatus.CANCELLED
    ];
    
    let completedUnits = 0;
    
    processedData.forEach(item => {
      if (isDeliveryGroup(item)) {
        // Para grupos: está completado si el delivery final está completado
        const group = item as DeliveryGroupAdapter;
        if (completedStatuses.includes(group.delivery.deliveryStatus.title as IDeliveryStatus)) {
          completedUnits++;
        }
      } else {
        // Para entregas individuales: verificar directamente el estado
        const delivery = item as DeliveryItemAdapter;
        if (completedStatuses.includes(delivery.deliveryStatus.title as IDeliveryStatus)) {
          completedUnits++;
        }
      }
    });
    
    const progressPercentage = Math.round((completedUnits / processedData.length) * 100);
    
    return progressPercentage;
  };

  const progress = calculateProgress();

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.progressInfoContainer}>
          <Text style={styles.progressText}>
            Progreso de tus entregas de hoy:
          </Text>
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>{progress}%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  // header, greeting, userName removidos porque ahora están en Greeting
  cardContainer: {
    backgroundColor: '#6C4FEA', // Color morado como en la imagen
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  progressInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  progressCircleContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  progressPercentage: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewTaskButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  viewTaskButtonText: {
    color: '#6C4FEA',
    fontWeight: 'bold',
  }
});
