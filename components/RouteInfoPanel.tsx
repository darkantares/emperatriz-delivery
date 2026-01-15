import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';

interface RouteInfoPanelProps {
  pointsCount: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
}

const RouteInfoPanel: React.FC<RouteInfoPanelProps> = ({ pointsCount, totalDistance, totalDuration }) => {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Puntos de entrega:</Text>
        <Text style={styles.infoValue}>{pointsCount}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Distancia total:</Text>
        <Text style={styles.infoValue}>{(totalDistance / 1000).toFixed(2)} km</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Tiempo estimado:</Text>
        <Text style={styles.infoValue}>{Math.round(totalDuration / 60)} min</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoPanel: {
    backgroundColor: CustomColors.backgroundDark,
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  infoLabel: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    color: CustomColors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RouteInfoPanel;