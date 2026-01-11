import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { courierLocationTracking } from '@/services/courierLocationService';
import { Ionicons } from '@expo/vector-icons';

/**
 * Componente para mostrar el estado del tracking de ubicación
 * Útil para debugging y para que el mensajero sepa que está siendo trackeado
 */
export const LocationTrackingIndicator: React.FC = () => {
  const [trackingStatus, setTrackingStatus] = useState({
    isTracking: false,
    lastSentTime: 0,
    hasUserId: false,
  });

  useEffect(() => {
    // Actualizar el estado cada segundo
    const interval = setInterval(() => {
      const status = courierLocationTracking.getTrackingStatus();
      setTrackingStatus({
        isTracking: status.isTracking,
        lastSentTime: status.lastSentTime,
        hasUserId: status.hasUserId,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTimeSinceLastUpdate = (): string => {
    if (!trackingStatus.lastSentTime) {
      return 'Sin actualizaciones';
    }

    const seconds = Math.floor((Date.now() - trackingStatus.lastSentTime) / 1000);
    
    if (seconds < 60) {
      return `Hace ${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    return `Hace ${minutes}m`;
  };

  const handleToggleTracking = async () => {
    if (trackingStatus.isTracking) {
      await courierLocationTracking.stopTracking();
    } else {
      await courierLocationTracking.startTracking();
    }
  };

  if (!trackingStatus.hasUserId) {
    return null; // No mostrar nada si no hay usuario
  }

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <View style={[
          styles.statusDot,
          trackingStatus.isTracking ? styles.statusActive : styles.statusInactive
        ]} />
        
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {trackingStatus.isTracking ? 'Ubicación activa' : 'Ubicación pausada'}
          </Text>
          {trackingStatus.isTracking && (
            <Text style={styles.timeText}>
              {getTimeSinceLastUpdate()}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={handleToggleTracking}
          style={styles.toggleButton}
        >
          <Ionicons 
            name={trackingStatus.isTracking ? 'pause' : 'play'} 
            size={16} 
            color="#666"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#FFC107',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
});
