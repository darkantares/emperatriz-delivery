import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';

interface RouteInfoPanelProps {
  pointsCount: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  isTraveling?: boolean;
  remainingDistance?: number; // meters
  remainingDuration?: number; // seconds
}

const RouteInfoPanel: React.FC<RouteInfoPanelProps> = ({ 
  pointsCount, 
  totalDistance, 
  totalDuration, 
  isTraveling = false, 
  remainingDistance, 
  remainingDuration 
}) => {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoPanelRow}>
        <Text style={styles.infoPanelLabel}>Puntos de entrega:</Text>
        <Text style={styles.infoPanelValue}>{pointsCount}</Text>
      </View>
      <View style={styles.infoPanelRow}>
        <Text style={styles.infoPanelLabel}>Distancia {isTraveling ? 'restante' : 'total'}:</Text>
        <Text style={styles.infoPanelValue}>
          {((isTraveling && remainingDistance !== undefined ? remainingDistance : totalDistance) / 1000).toFixed(2)} km
        </Text>
      </View>
      <View style={styles.infoPanelRow}>
        <Text style={styles.infoPanelLabel}>Tiempo {isTraveling ? 'restante' : 'estimado'}:</Text>
        <Text style={styles.infoPanelValue}>
          {Math.round((isTraveling && remainingDuration !== undefined ? remainingDuration : totalDuration) / 60)} min
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoPanel: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoPanelLabel: {
    color: CustomColors.textLight,
    fontSize: 14,
    opacity: 0.8,
  },
  infoPanelValue: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#4CAF50',
  },
});

export default RouteInfoPanel;