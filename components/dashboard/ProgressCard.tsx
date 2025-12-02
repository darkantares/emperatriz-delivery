import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { DeliveryItemAdapter, DeliveryGroupAdapter } from '@/interfaces/delivery/deliveryAdapters';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProgressCardProps {
  deliveries: DeliveryItemAdapter[];
  inProgressDelivery?: DeliveryItemAdapter | null;
}

export const ProgressCard = ({ deliveries, inProgressDelivery }: ProgressCardProps) => {
  const [maxTotal, setMaxTotal] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  
  const dateKey = new Date().toISOString().slice(0, 10);
  const STORAGE_KEY_TOTAL = `delivery_progress_total_${dateKey}`;
  const STORAGE_KEY_COMPLETED = `delivery_progress_completed_${dateKey}`;

  const isDeliveryGroup = (item: DeliveryItemAdapter | DeliveryGroupAdapter): item is DeliveryGroupAdapter => {
    return 'shipmentId' in item && 'pickups' in item && 'delivery' in item;
  };

  const calculateCounts = () => {
    const allDeliveries = [...deliveries];
    if (inProgressDelivery) {
      allDeliveries.push(inProgressDelivery);
    }

    const completedStatuses = [
      IDeliveryStatus.DELIVERED,
      IDeliveryStatus.RETURNED,
      IDeliveryStatus.CANCELLED,
    ];

    let pendingUnits = 0;
    let completedUnits = 0;

    allDeliveries.forEach(item => {
      let status: IDeliveryStatus;
      
      if (isDeliveryGroup(item)) {
        status = item.delivery.deliveryStatus.title as IDeliveryStatus;
      } else {
        status = item.deliveryStatus.title as IDeliveryStatus;
      }

      if (completedStatuses.includes(status)) {
        completedUnits++;
      } else {
        pendingUnits++;
      }
    });

    return { 
      pending: pendingUnits, 
      current: allDeliveries.length, 
      completed: completedUnits 
    };
  };

  useEffect(() => {
    let isMounted = true;

    const syncProgress = async () => {
      try {
        const { current, pending } = calculateCounts();

        // Obtener valores almacenados
        const storedTotal = await AsyncStorage.getItem(STORAGE_KEY_TOTAL);
        const storedCompleted = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED);
        
        const previousTotal = storedTotal ? Number(storedTotal) : 0;
        const previousCompleted = storedCompleted ? Number(storedCompleted) : 0;

        // El total SOLO puede aumentar, nunca disminuir
        const newTotal = Math.max(current, previousTotal);

        // Calcular completados: si el total actual es menor que el máximo,
        // significa que se completaron entregas
        const deliveriesDifference = previousTotal - current;
        const newCompleted = deliveriesDifference > 0 
          ? previousCompleted + deliveriesDifference 
          : previousCompleted;

        if (isMounted) {
          setMaxTotal(newTotal);
          setCompletedCount(newCompleted);

          // Guardar en AsyncStorage
          if (newTotal !== previousTotal) {
            await AsyncStorage.setItem(STORAGE_KEY_TOTAL, String(newTotal));
          }
          if (newCompleted !== previousCompleted) {
            await AsyncStorage.setItem(STORAGE_KEY_COMPLETED, String(newCompleted));
          }
        }
      } catch (error) {
        console.error('Error syncing progress:', error);
      }
    };

    syncProgress();

    return () => {
      isMounted = false;
    };
  }, [deliveries, inProgressDelivery]);

  const pendingCount = maxTotal - completedCount;

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.progressInfoContainer}>
          <Text style={styles.progressText}>
            Progreso de tus entregas de hoy:
          </Text>
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>
                {completedCount}/{maxTotal}
              </Text>
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
  cardContainer: {
    backgroundColor: '#6C4FEA',
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
});