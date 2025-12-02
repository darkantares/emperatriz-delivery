import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { DeliveryItemAdapter, DeliveryGroupAdapter, groupDeliveriesByShipment } from '@/interfaces/delivery/deliveryAdapters';

interface ProgressCardProps {
  userName: string;
  deliveries: DeliveryItemAdapter[];
  inProgressDelivery?: DeliveryItemAdapter | null;
  onPressViewTask?: () => void;
}

export const ProgressCard = ({ deliveries, inProgressDelivery }: ProgressCardProps) => {
  // Type guard para verificar si el item es un grupo
  const isDeliveryGroup = (item: DeliveryItemAdapter | DeliveryGroupAdapter): item is DeliveryGroupAdapter => {
    return 'shipmentId' in item && 'pickups' in item && 'delivery' in item;
  };

  const calculateCounts = () => {
    const allDeliveries = [...deliveries];
    if (inProgressDelivery) {
      allDeliveries.push(inProgressDelivery);
    }

    const processedData = groupDeliveriesByShipment(allDeliveries);
    const totalUnits = processedData.length;

    const completedStatuses = [
      IDeliveryStatus.DELIVERED,
      IDeliveryStatus.RETURNED,
      IDeliveryStatus.CANCELLED,
    ];

    let pendingUnits = 0;

    processedData.forEach(item => {
      if (isDeliveryGroup(item)) {
        const status = (item as DeliveryGroupAdapter).delivery.deliveryStatus.title as IDeliveryStatus;
        if (!completedStatuses.includes(status)) {
          pendingUnits++;
        }
      } else {
        const status = (item as DeliveryItemAdapter).deliveryStatus.title as IDeliveryStatus;
        if (!completedStatuses.includes(status)) {
          pendingUnits++;
        }
      }
    });

    return { pending: pendingUnits, total: totalUnits };
  };

  const { pending, total } = calculateCounts();
  const completed = Math.max(0, total - pending);

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.progressInfoContainer}>
          <Text style={styles.progressText}>
            Progreso de tus entregas de hoy:
          </Text>
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>{completed}/{total}</Text>
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
