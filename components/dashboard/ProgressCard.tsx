import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';

interface ProgressCardProps {
  userName: string;
  deliveries: Array<{ deliveryStatus: IDeliveryStatusEntity }>;
  onPressViewTask?: () => void;
}

export const ProgressCard = ({ userName, deliveries, onPressViewTask }: ProgressCardProps) => {
  // Calcular el porcentaje de entregas completadas
  const calculateProgress = () => {
    if (deliveries.length === 0) return 100;
    
    const completedStatuses = [
      // IDeliveryStatus.COMPLETED,
      IDeliveryStatus.RETURNED,
      // IDeliveryStatus.FAILED,
      IDeliveryStatus.CANCELLED
    ];
    
    const completedDeliveries = deliveries.filter(
      delivery => completedStatuses.includes(delivery.deliveryStatus.title as IDeliveryStatus)
    ).length;
    
    const pendingDeliveries = deliveries.length - completedDeliveries;
    const progressPercentage = Math.round((completedDeliveries / deliveries.length) * 100);
    
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
